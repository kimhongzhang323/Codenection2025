package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.model.repo.GeminiModel;
import com.example.AutoDocX.model.repo.SendMessageResult;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.parser.model.GraphLink;
import com.example.AutoDocX.parser.model.GraphNode;
import com.example.AutoDocX.parser.model.GraphAlgo;
import com.example.AutoDocX.service.RepoHandler.NodeNotFoundException;
import com.google.genai.types.Tool;
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
import com.example.AutoDocX.model.repo.Model;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

@Service
public class McpToolbox {
    private final RepoHandler repoHandler;
    private final Model model;
    private final ObjectMapper mapper = new ObjectMapper();

    public McpToolbox(RepoHandler repoHandler, @Qualifier("geminiCentral") Model model) {
        this.repoHandler = repoHandler;
        this.model = model;
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

        StringBuilder summary = new StringBuilder();
        summary.append("{\n");
        summary.append("  \"type\": \"METHOD\",\n");
        summary.append("  \"method\": \"").append(methodName).append("\",\n");
        summary.append("  \"purpose\": \"").append(description.replace("\"", "'")).append("\",\n");
        summary.append("  \"calls\": [\"").append(String.join("\", \"", calls)).append("\"]\n");
        summary.append("}");

        return summary.toString();
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

    // ===== Planning helpers =====
    public String writeDocPlan(Session session, Object planObj) throws JsonProcessingException {
        // planObj is expected to be a List<Map<String,Object>> compatible structure
        String json = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(planObj);
        session.getMemory().getPlan().replaceEntry("plan", json);
        return "OK: plan written with " + ((planObj instanceof java.util.Collection) ? ((java.util.Collection<?>) planObj).size() : 1) + " section(s).";
    }

    public String clearDocPlan(Session session) {
        session.getMemory().getPlan().removeEntry("plan");
        return "OK: plan cleared.";
    }

    public String getDocPlan(Session session) {
        String plan = session.getMemory().getPlan().getEntry("plan");
        return plan == null ? "[]" : plan;
    }

    public String executePlan(Session session, ClonedRepo repo, Graph graph) {
        String planJson = getDocPlan(session);
        List<Map<String, Object>> sections;
        try {
            sections = mapper.readValue(planJson, new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>(){});
        } catch (Exception e) {
            return "Plan parse failed: " + e.getMessage();
        }

        List<AbstractMap.SimpleEntry<List<com.google.genai.types.Content>, List<com.google.genai.types.Tool>>> requests = new ArrayList<>();
        for (Map<String, Object> sec : sections) {
            String sectionName = String.valueOf(sec.getOrDefault("section_name", "Section"));
            String focus = String.valueOf(sec.getOrDefault("focus", ""));
            @SuppressWarnings("unchecked")
            List<String> nodes = (List<String>) sec.getOrDefault("nodes", List.of());

            String system = "You are a senior technical writer. Produce the documentation content for the given section. Keep it concise and accurate.";
            StringBuilder user = new StringBuilder();
            user.append("SECTION: ").append(sectionName).append("\n");
            user.append("FOCUS: ").append(focus).append("\n\n");
            user.append("RECENT SUMMARY: \n").append(session.getMemory().getSummary().toString(5)).append("\n\n");

            List<com.google.genai.types.Content> contents = new ArrayList<>();
            contents.add(com.google.genai.types.Content.builder().role("system").parts(List.of(com.google.genai.types.Part.fromText(system))).build());
            contents.add(com.google.genai.types.Content.builder().role("user").parts(List.of(com.google.genai.types.Part.fromText(user.toString()))).build());

            ToolExecutionContext ctx = new ToolExecutionContext(repo, graph, session);
            for (String nodeId : nodes) {
                try {
                    String code = getCode(repo, nodeId);
                    String neigh = getNeighbourSubgraph(graph, nodeId, 2);
                    contents.add(com.google.genai.types.Content.builder().role("user").parts(List.of(com.google.genai.types.Part.fromText("NODE:" + nodeId + "\nCODE:\n" + code + "\nNEIGHBORS:\n" + neigh))).build());
                } catch (Exception e) {
                    contents.add(com.google.genai.types.Content.builder().role("user").parts(List.of(com.google.genai.types.Part.fromText("NODE:" + nodeId + "\nERROR: " + e.getMessage()))).build());
                }
            }

            // For execution, we don't need tools; just pure generation
            requests.add(new AbstractMap.SimpleEntry<>(contents, List.of()));
        }

        List<SendMessageResult> results = ((com.example.AutoDocX.model.repo.GeminiCentral) model).sendMessageBulk(requests);
        Map<String, String> sectionOutputs = new LinkedHashMap<>();
        for (int i = 0; i < results.size(); i++) {
            String sectionName = String.valueOf(sections.get(i).getOrDefault("section_name", "Section"));
            SendMessageResult r = results.get(i);
            String text = r.getText().orElse("No output.");
            sectionOutputs.put(sectionName, text);
            session.getMemory().getSummary().replaceEntry("doc_section:" + sectionName, text);
        }

        StringBuilder sb = new StringBuilder();
        sb.append("# Project Documentation\n\n");
        sb.append("## Table of Contents\n");
        int idx = 1;
        for (String name : sectionOutputs.keySet()) sb.append(idx++).append(". ").append(name).append("\n");
        sb.append("\n");
        for (Map.Entry<String, String> e : sectionOutputs.entrySet()) {
            sb.append("## ").append(e.getKey()).append("\n\n");
            sb.append(e.getValue()).append("\n\n");
        }

        String finalDoc = sb.toString();
        session.getMemory().getSummary().replaceEntry("final_documentation", finalDoc);
        return finalDoc;
    }

    public String updateDocumentation(Session session, String content) {
        session.getMemory().getSummary().replaceEntry("documentation", content);
        return "OK: documentation updated (" + content.length() + " chars)";
    }
}
