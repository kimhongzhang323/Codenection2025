package com.example.AutoDocX.service.agent.tools;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.model.Documentation;
import com.example.AutoDocX.model.GeminiModel;
import com.example.AutoDocX.model.SendMessageResult;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.parser.model.GraphLink;
import com.example.AutoDocX.parser.model.GraphNode;
import com.example.AutoDocX.parser.model.GraphAlgo;
import com.example.AutoDocX.service.DocumentHandlingService;
import com.example.AutoDocX.service.DocumentationHandler;
import com.example.AutoDocX.service.GitService;
import com.example.AutoDocX.service.RepoHandler;
import com.example.AutoDocX.service.RepoHandler.NodeNotFoundException;
import com.example.AutoDocX.service.agent.data.Session;
import com.google.genai.types.Tool;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.FileVisitResult;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.AccessDeniedException;
import com.example.AutoDocX.model.Model;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.api.errors.GitAPIException;

@Service
public class McpToolUtils {
    private final RepoHandler repoHandler;
    private final Model model;
    private final DocumentHandlingService documentHandlingService;
    private final ObjectMapper mapper = new ObjectMapper();

    public McpToolUtils(RepoHandler repoHandler, @Qualifier("geminiCentral") Model model, DocumentHandlingService documentHandlingService) {
        this.repoHandler = repoHandler;
        this.model = model;
        this.documentHandlingService = documentHandlingService;
    }

    public GitService getGitService() {
        return repoHandler.getGitService();
    }

    public String getCode(ClonedRepo repo, String nodeId) throws IOException, NodeNotFoundException {
        return repoHandler.getCodeChunk(repo, nodeId);
    }

    public String folderTreeStructure(ClonedRepo repo, String folderPath, int depth) throws IOException {
        Path rootPath = repo.getClonedPath();
        String effectiveFolderPath = (folderPath == null || folderPath.isEmpty() || folderPath.startsWith("/") || folderPath.startsWith("\\")) ? "." + folderPath : folderPath;
        Path targetPath = rootPath.resolve(effectiveFolderPath).normalize(); // Normalize to handle "." correctly
        StringBuilder tree = new StringBuilder();

        if (!Files.exists(targetPath) || !Files.isDirectory(targetPath)) {
            return "Folder not found or is not a directory: " + folderPath;
        }

        // Add the root folder to the tree
        tree.append("-[D] ").append(targetPath.getFileName()).append("/").append("\n");

        Files.walkFileTree(targetPath, java.util.EnumSet.of(java.nio.file.FileVisitOption.FOLLOW_LINKS), depth, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                if (!dir.equals(targetPath)) { // Exclude the root folder itself, as it's already added
                    int currentDepth = targetPath.relativize(dir).getNameCount();
                    tree.append("  ").append("|   ".repeat(currentDepth - 1)).append("|--[D] ");
                    tree.append(dir.getFileName()).append("/").append("\n");
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                int currentDepth = targetPath.relativize(file).getNameCount();
                tree.append("  ").append("|   ".repeat(currentDepth - 1)).append("|--[F] ");
                tree.append(file.getFileName()).append("\n");
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                if (exc instanceof AccessDeniedException) {
                    tree.append("  ").append("|   ".repeat(targetPath.relativize(file).getNameCount() - 1)).append("-[E] ");
                    tree.append(file.getFileName()).append(" (Failed: Access Denied)\n");
                    System.err.println("DEBUG: Visit failed for path (Access Denied): " + file + " Error: " + exc.getMessage());
                    return FileVisitResult.CONTINUE; // Continue if a file visit fails
                }
                throw exc; // Re-throw other IOExceptions
            }
        });
        return tree.toString();
    }

    public String readFile(ClonedRepo repo, String filePath) throws IOException {
        Path rootPath = repo.getClonedPath();
        String effectiveFilePath = (filePath == null || filePath.isEmpty() || filePath.startsWith("/") || filePath.startsWith("\\")) ? "." + filePath : filePath;
        Path targetPath = rootPath.resolve(effectiveFilePath).normalize(); // Normalize to handle "." correctly
        if (!Files.exists(targetPath) || Files.isDirectory(targetPath)) {
            throw new IOException("File not found or is a directory: " + filePath);
        }
        return Files.readString(targetPath);
    }

    public List<String> getNodesInFile(Graph graph, String filePath) {
        return graph.getNodes().stream()
            .filter(node -> filePath.equals(node.getFilePath()) && node.getType() == GraphNode.NodeType.CLASS)
            .map(GraphNode::getLabel)
            .collect(Collectors.toList());
    }

    public String findCentralNodes(Graph graph, int n) {
        List<GraphNode> centralNodes = GraphAlgo.findCentralClassNodes(graph, n);
        return formatNodeLinks(graph, centralNodes);
    }

    public String findCentralNodesByPageRank(Graph graph, int n) {
        List<GraphNode> centralNodes = GraphAlgo.findCentralNodesByPageRank(graph, n);
        return formatNodeLinks(graph, centralNodes);
    }

    public String findHubNodes(Graph graph, int n) {
        List<GraphNode> hubNodes = GraphAlgo.findCentralNodesByPageRank(graph, n);
        return formatNodeLinks(graph, hubNodes);
    }

    private String formatNodeLinks(Graph graph, List<GraphNode> nodes) {
        return nodes.stream()
                .map(node -> {
                    // collect all links relevant to this class (including methods collapsed into class)
                    List<GraphLink> links = GraphAlgo.getAllLinksForClass(graph, node);

                    // incoming = who points to me (or my methods)
                    String incoming = links.stream()
                            .filter(link -> link.getTargetID().equals(node.getId()) ||
                                    link.getTargetID().startsWith("method_" + node.getLabel()))
                            .map(link -> graph.getNode(link.getSourceID()).orElse(null))
                            .filter(Objects::nonNull)
                            .map(GraphNode::getLabel)
                            .distinct()
                            .collect(Collectors.joining(", "));

                    // outgoing = who I point to (or my methods point to)
                    String outgoing = links.stream()
                            .filter(link -> link.getSourceID().equals(node.getId()) ||
                                    link.getSourceID().startsWith("method_" + node.getLabel()))
                            .map(link -> graph.getNode(link.getTargetID()).orElse(null))
                            .filter(Objects::nonNull)
                            .map(GraphNode::getLabel)
                            .distinct()
                            .collect(Collectors.joining(", "));

                    if (incoming.isEmpty()) incoming = "";
                    if (outgoing.isEmpty()) outgoing = "";

                    return node.getLabel() + " | Uses: [" + outgoing + "]; Used by: [" + incoming + "]";
                })
                .collect(Collectors.joining("\n"));
    }



    public String smartDfs(Graph graph, String startNodeId, int depthLimit, double minPopularityRatio) {
        return GraphAlgo.smartDfs(graph, startNodeId, depthLimit, minPopularityRatio);
    }

    public String getNeighbourSubgraph(Graph graph, String startNodeId, int depthLimit) {
        return GraphAlgo.dfsTraversalToString(graph, startNodeId, depthLimit);
    }

    public String searchNodes(Graph graph, String query, Integer limit) {
        return searchNodes(graph, null, query, limit);
    }

    public String searchNodes(Graph graph, ClonedRepo repo, String query, Integer limit) {
        if (query == null || query.isBlank()) {
            return "Query must not be empty.";
        }

        int resolvedLimit = limit == null ? 20 : limit;
        List<GraphNode> matches = GraphAlgo.searchNodes(graph, query, resolvedLimit);

        if (matches.isEmpty()) {
            return "No nodes found for query '" + query + "'.";
        }

        String loweredQuery = query.toLowerCase(Locale.ROOT);
        StringBuilder builder = new StringBuilder();
        for (GraphNode node : matches) {
            boolean contentHit = false;
            if (repo != null) {
                contentHit = repoHandler.getCodeChunkSafe(repo, node.getId())
                        .map(code -> code.toLowerCase(Locale.ROOT).contains(loweredQuery))
                        .orElse(false);
            }

            builder.append(node.getLabel())
                    .append(" (")
                    .append(node.getId())
                    .append(") [")
                    .append(node.getType())
                    .append("] - ")
                    .append(Optional.ofNullable(node.getFilePath()).orElse("<unknown>"));

            if (contentHit) {
                builder.append(" (content match)");
            }

            builder.append("\n");
        }

        if (resolvedLimit > 0 && matches.size() == resolvedLimit) {
            builder.append("...limited to ").append(resolvedLimit).append(" results\n");
        }

        return builder.toString().trim();
    }

    /**
     * Assembles a structured JSON summary for a node, handling different node types.
     * This is a local operation with NO model call.
     * @param graph The code graph.
     * @param nodeId The ID of the node to summarize.
     * @param description The description of the node's purpose, to be inserted directly.
     * @return A JSON string containing the combined summary.
     */
    public String compactNode(Graph graph, String nodeId, String description) {
        GraphNode node = graph.getNode(nodeId)
                .orElseThrow(() -> new IllegalArgumentException("Node not found: " + nodeId));

        switch (node.getType()) {
            case CLASS:
                return compactClassNode(graph, node, description);
            case METHOD:
                return compactMethodNode(graph, node, description);
            default:
                // Default for FIELD or other types
                return String.format("{\"type\": \"%s\", \"label\": \"%s\", \"purpose\": \"%s\"}",
                        node.getType(), node.getLabel(), description.replace("\"", "'"));
        }
    }

    private String compactClassNode(Graph graph, GraphNode classNode, String description) {
        String className = classNode.getLabel();

        List<String> publicMethods = graph.getNodes().stream()
                .filter(node -> node.getType() == GraphNode.NodeType.METHOD &&
                                node.getId().startsWith("method_" + className + "_"))
                .map(GraphNode::getLabel)
                .collect(Collectors.toList());

        List<String> dependencies = graph.getLinks().stream()
                .filter(link -> link.getSourceID().equals(classNode.getId()))
                .map(link -> graph.getNode(link.getTargetID()).orElse(null))
                .filter(Objects::nonNull)
                .map(GraphNode::getLabel)
                .distinct()
                .collect(Collectors.toList());

        StringBuilder summary = new StringBuilder();
        summary.append("{\n");
        summary.append("  \"type\": \"CLASS\",\n");
        summary.append("  \"class\": \"").append(className).append("\",\n");
        summary.append("  \"purpose\": \"").append(description.replace("\"", "'")).append("\",\n");
        summary.append("  \"public_methods\": [\"").append(String.join("\", \"", publicMethods)).append("\"],\n");
        summary.append("  \"dependencies\": [\"").append(String.join("\", \"", dependencies)).append("\"]\n");
        summary.append("}");

        return summary.toString();
    }

    private String compactMethodNode(Graph graph, GraphNode methodNode, String description) {
        String methodName = methodNode.getLabel();

        List<String> calls = graph.getLinks().stream()
                .filter(link -> link.getSourceID().equals(methodNode.getId()))
                .map(link -> graph.getNode(link.getTargetID()).orElse(null))
                .filter(Objects::nonNull)
                .map(GraphNode::getLabel)
                .distinct()
                .collect(Collectors.toList());

        String summary = "{\n" +
                "  \"type\": \"METHOD\",\n" +
                "  \"method\": \"" + methodName + "\",\n" +
                "  \"purpose\": \"" + description.replace("\"", "'") + "\",\n" +
                "  \"calls\": [\"" + String.join("\", \"", calls) + "\"]\n" +
                "}";

        return summary;
    }

    public String summarizeNodesBulk(Graph graph, List<String> nodeIds, Session session) {
        List<AbstractMap.SimpleEntry<List<Content>, List<Tool>>> requests = new ArrayList<>();
        List<String> originalNodeIds = new ArrayList<>(nodeIds); // Keep original order

        for (String nodeId : nodeIds) {
            String neighbors = getNeighbourSubgraph(graph, nodeId, 1);
            String prompt = "Give a one-sentence summary of the node '" + nodeId + "' based on its name and its neighbors: " + neighbors;
            List<Content> contents = List.of(Content.builder().role("user").parts(Part.builder().text(prompt).build()).build());
            requests.add(GeminiModel.createArgs(contents, List.of()));
        }

        model.sendMessageBulkAsync(requests).thenAccept(results -> {
            for (int i = 0; i < results.size(); i++) {
                SendMessageResult result = results.get(i);
                String nodeId = originalNodeIds.get(i);
                result.getText().ifPresent(summary -> {
                    session.getMemory().getSummary().addEntry(nodeId, summary);
                    System.out.println("DEBUG: Bulk summarized " + nodeId);
                });
            }
        });

        return "Bulk summarization process initiated for " + nodeIds.size() + " nodes.";
    }

    public String updateUnderstanding(Session session, String text) {
        session.getMemory().getSummary().replaceEntry("understanding", text);
        return text;
    }

    public String addSectionPlan(Session session, String sectionName, String focus, List<String> nodes) throws Exception {
        Object planObj = session.getMemory().getPlan().getRawEntry("plan");
        Map<String, Object> plan;

        if (planObj == null) {
            plan = new LinkedHashMap<>();
        } else if (planObj instanceof String) {
            String planJson = (String) planObj;
            if (planJson.isEmpty() || planJson.equals("null")) {
                plan = new LinkedHashMap<>();
            } else {
                try {
                    plan = mapper.readValue(planJson, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                } catch (JsonProcessingException e) {
                    // It might be double-encoded, try decoding once.
                    try {
                        String decoded = mapper.readValue(planJson, String.class);
                        plan = mapper.readValue(decoded, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                    } catch (JsonProcessingException e2) {
                        throw new Exception("Failed to parse plan after attempting to decode" + e2.toString());
                    }
                }
            }
        } else if (planObj instanceof Map) {
            plan = (Map<String, Object>) planObj;
        } else {
            plan = new LinkedHashMap<>();
        }

        Map<String, Object> section = new LinkedHashMap<>();
        section.put("focus", focus);
        section.put("nodes", nodes);
        plan.put(sectionName, section);

        session.getMemory().getPlan().replaceEntry("plan", plan); // Store the map directly
        return "OK: section '" + sectionName + "' added to plan.";
    }

    public static String getDocPlan(Session session) {
        String plan = session.getMemory().getPlan().getEntry("plan");
        return plan == null ? "[]" : plan;
    }



    public String updateDocumentation(Session session, String content) {
        session.getMemory().getSummary().replaceEntry("documentation", content);
        return "OK: documentation updated (" + content.length() + " chars)";
    }

    public String replaceStringInDoc(Session session, String docKey, String oldString, String newString) {
        DocumentationHandler docHandler = documentHandlingService.getDocumentHandler(session);
        Documentation doc = docHandler.get(docKey);
        if (doc == null) {
            throw new IllegalArgumentException("Document with key '" + docKey + "' not found.");
        }
        String content = doc.getContent();
        String newContent = content.replace(oldString, newString);
        doc.setContent(newContent);
        return "OK: Replaced string in document '" + docKey + "'.";
    }

    public String insertEditIntoDoc(Session session, String docKey, String patch) {
        DocumentationHandler docHandler = documentHandlingService.getDocumentHandler(session);
        Documentation doc = docHandler.get(docKey);
        if (doc == null) {
            throw new IllegalArgumentException("Document with key '" + docKey + "' not found.");
        }
        String originalContent = doc.getContent();

        String prompt = "You are an expert text editor. Apply the following patch to the original document. " +
                "The patch uses '...existing content...' to denote unchanged parts. " +
                "Respond with only the full, modified document content.\n\n" +
                "--- ORIGINAL DOCUMENT ---\n" +
                originalContent + "\n\n" +
                "--- PATCH ---\n" +
                patch;

        List<Content> contents = List.of(Content.builder().role("user").parts(Part.builder().text(prompt).build()).build());
        SendMessageResult result = model.sendMessage(contents, List.of());

        String newContent = result.getText().orElseThrow(() -> new RuntimeException("Model failed to generate the edited document."));
        doc.setContent(newContent);

        return "OK: Applied intelligent edit to document '" + docKey + "'.";
    }

    public String modifyDocs(Session session, List<String> documentsInvolved, String saveKey, String whatToDo) {
        DocumentationHandler docHandler = documentHandlingService.getDocumentHandler(session);
        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("You are an expert document editor. Perform the following task as instructed. Respond with only the final, resulting document content.\n\n");
        promptBuilder.append("--- TASK ---\n");
        promptBuilder.append(whatToDo).append("\n\n");

        for (String docKey : documentsInvolved) {
            Documentation doc = docHandler.get(docKey);
            if (doc == null) {
                throw new IllegalArgumentException("Document with key '" + docKey + "' not found in the list of documents to modify.");
            }
            promptBuilder.append("--- DOCUMENT: ").append(docKey).append(" ---\n");
            promptBuilder.append(doc.getContent()).append("\n\n");
        }

        List<Content> contents = List.of(Content.builder().role("user").parts(Part.builder().text(promptBuilder.toString()).build()).build());
        SendMessageResult result = model.sendMessage(contents, List.of());

        String newContent = result.getText().orElseThrow(() -> new RuntimeException("Model failed to generate the modified document."));
        docHandler.save(saveKey, new Documentation(newContent));

        return "OK: The document modification task was completed and the result was saved to '" + saveKey + "'.";
    }

    public String readDoc(Session session, String key, String focusPrompt) {
        DocumentationHandler docHandler = documentHandlingService.getDocumentHandler(session);
        String resolvedKey = (key == null || key.isBlank()) ? docHandler.getDefaultDocumentationKey() : key;
        if (resolvedKey == null || resolvedKey.isBlank()) {
            resolvedKey = docHandler.getMostRecentDocumentationKey();
        }

        if (resolvedKey == null || resolvedKey.isBlank()) {
            throw new IllegalArgumentException("No documentation key provided and no default document available.");
        }

        Documentation doc = docHandler.get(resolvedKey);
        if (doc == null) {
            throw new IllegalArgumentException("Document with key '" + resolvedKey + "' not found.");
        }

        String documentContent = Optional.ofNullable(doc.getContent()).orElse("");
        String directive = (focusPrompt == null || focusPrompt.isBlank())
                ? "Provide a concise, high-signal summary of the document. Only include the most important takeaways."
                : "Provide a concise, high-signal summary that focuses on: " + focusPrompt.trim() + ". Omit unrelated details.";

        String prompt = "You are an expert technical summariser. Respond with a single tight paragraph or bullet list (under ~120 words).\n\n"
                + directive + "\n\n"
                + "--- DOCUMENT: " + resolvedKey + " ---\n"
                + documentContent;

        List<Content> contents = List.of(Content.builder().role("user").parts(Part.builder().text(prompt).build()).build());
        SendMessageResult result = model.sendMessage(contents, List.of());

        return result.getText().orElseThrow(() -> new RuntimeException("Model failed to generate the document summary."));
    }

    public String expandDoc(Session session, String key, int countdown) {
        DocumentationHandler docHandler = documentHandlingService.getDocumentHandler(session);
        docHandler.setExpandedCounter(key, countdown);
        return "OK: Document '" + key + "' will be expanded for the next " + countdown + " turns.";
    }

    public String getModifiedNodes(Graph graph, DocumentationHandler docHandler, String docKey, GitService gitService, Path repoPath) {
        if (docKey == null || docKey.isBlank()) {
            docKey = docHandler.getDefaultDocumentationKey();
        }
        if (docKey == null) {
            docKey = docHandler.getMostRecentDocumentationKey();
        }

        Documentation doc = docHandler.get(docKey);
        if (doc == null) {
            return "Error: Documentation with key '" + docKey + "' not found.";
        }

        Date docLastModified = doc.getLastModified();
        if (docLastModified == null) {
            return "Warning: Documentation '" + docKey + "' has no modification date. Cannot determine modified nodes.";
        }

        try {
            List<RevCommit> commits = gitService.getCommitsSince(repoPath, docLastModified);
            if (commits.isEmpty()) {
                return "No new commits since the documentation was last updated.";
            }

            StringBuilder result = new StringBuilder();
            Set<String> allModifiedNodes = new LinkedHashSet<>();

            for (RevCommit commit : commits) {
                result.append(commit.getShortMessage()).append("\n");
                List<String> modifiedFilesInCommit = gitService.getModifiedFilesInCommit(repoPath, commit.getName());

                Set<String> nodesInCommit = modifiedFilesInCommit.stream()
                        .flatMap(filePath -> graph.getNodes().stream()
                                .filter(node -> node.getFilePath().endsWith(filePath.replace("/", java.io.File.separator))))
                        .map(GraphNode::getId)
                        .collect(Collectors.toSet());

                result.append(String.join(" ", nodesInCommit)).append("\n\n");
                allModifiedNodes.addAll(nodesInCommit);
            }

            result.append("ALL MODIFIED NODES:\n");
            result.append(String.join("\n", allModifiedNodes));

            return result.toString();

        } catch (IOException | GitAPIException e) {
            return "Error retrieving commit history: " + e.getMessage();
        }
    }
}
