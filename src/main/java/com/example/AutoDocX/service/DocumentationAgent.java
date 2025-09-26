package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.model.Documentation;
import com.example.AutoDocX.model.repo.Model;
import com.example.AutoDocX.model.repo.GeminiModel;
import com.example.AutoDocX.model.repo.SendMessageResult;
import com.example.AutoDocX.model.repo.ModelFinishReason;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.parser.model.GraphAlgo;
import com.example.AutoDocX.parser.model.GraphNode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class DocumentationAgent {

    private final RepoHandler repoHandler;
    private final SessionManager sessionManager;
    private final McpToolKit mcpToolKit;
    private final Model model;
    private final GeneralSummaryAgent generalSummaryAgent;
    private final SummaryAgent summaryAgent;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final int DEFAULT_MAX_ITERATIONS = 5;

    @Autowired
    public DocumentationAgent(
            RepoHandler repoHandler,
            SessionManager sessionManager,
            McpToolKit mcpToolKit,
            @Qualifier("geminiCentral") Model model,
            GeneralSummaryAgent generalSummaryAgent,
            SummaryAgent summaryAgent
    ) {
        this.repoHandler = repoHandler;
        this.sessionManager = sessionManager;
        this.mcpToolKit = mcpToolKit;
        this.model = model;
        this.generalSummaryAgent = generalSummaryAgent;
        this.summaryAgent = summaryAgent;
    }

    public String run(String gitUrl, String branch, String userPrompt) {
        return run(gitUrl, branch, userPrompt, null);
    }

    public String run(String gitUrl, String branch, String userPrompt, Integer iterationLimit) {
        Session session = sessionManager.getSession(gitUrl, branch);
        ClonedRepo repo = repoHandler.getRepo(gitUrl, branch);
        if (repo == null) return "Repository unavailable.";

        session.getDocumentationHandler().decrementAllExpandedCounters();

        if (!session.isDocumentationLoaded()) {
            session.getDocumentationHandler().loadFromDirectory(repo.getClonedPath());
            session.setDocumentationLoaded(true);
        }

        Graph graph;
        try { graph = repoHandler.getGraph(repo); } catch (Exception e) { return "Graph load failed: " + e.getMessage(); }

        ToolExecutionContext ctx = new ToolExecutionContext(repo, graph, session);

        int iterations = 0;
        int maxIterations = (iterationLimit == null || iterationLimit <= 0) ? DEFAULT_MAX_ITERATIONS : iterationLimit;
        while (iterations++ < maxIterations) {
            List<Tool> tools = mcpToolKit.getDocumentationAgentTools();
            List<Content> contents = buildLoopContent(session, userPrompt);

            SendMessageResult result;
            try {
                result = model.sendMessageNew(contents, tools);
            } catch (Exception e) {
                String msg = "Model invocation error: " + e.getMessage();
                System.err.println("WARN (DocumentationAgent): " + msg);
                session.getMemory().getEpisodic().addEntry("error:model_call", msg);
                break;
            }

            if (result.getModelFinishReason() == ModelFinishReason.OUTPUT_ERROR ||
                result.getModelFinishReason() == ModelFinishReason.INPUT_ERROR) {
                String msg = "Model stopped due to " + result.getModelFinishReason();
                System.err.println("WARN (DocumentationAgent): " + msg);
                session.getMemory().getEpisodic().addEntry("error:model_finish", msg);
                break; // emergency stop
            }
            if (result.getText().isPresent()) {
                String assistant = result.getText().get();
                session.getMemory().getEpisodic().addEntry("doc_agent.assistant", assistant);
            }

            if (!result.getToolCalls().isEmpty()) {
                for (var call : result.getToolCalls()) {
                    String name = call.getName();
                    Map<String, Object> args = call.getArgs();
                    try {
                        // Tool execution
                        switch (name) {
                            case "get_summary": {
                                String query = (String) args.get("query");
                                String sum;
                                if (query != null && !query.isBlank()) {
                                    summaryAgent.run(session.getGitUrl(), session.getBranch(), query);
                                } else {
                                    sum = generalSummaryAgent.run(session.getGitUrl(), session.getBranch(), "Project Level Understanding");
                                    session.getMemory().getSummary().replaceEntry(query, sum);
                                }
                                break;
                            }
                            case "execute_plan": {
                                String key = (String) args.get("key");
                                if (key == null || key.isBlank()) {
                                    throw new IllegalArgumentException("Parameter 'key' is required for execute_plan.");
                                }
                                String planResult = executePlanInternal(session, repo, graph);
                                Documentation doc = new Documentation(planResult);
                                session.getDocumentationHandler().save(key, doc);
                                System.out.println("Plan execution finished. Result stored in '" + key + "'.");

                                // Safely log the tool call, handling null args and empty results
                                String toolLogKey = "model:tool_call:" + name + (args != null ? args.toString() : "{}");
                                String toolLogValue = "Execution finished.";
                                if (planResult != null && !planResult.isEmpty()) {
                                    toolLogValue += " Result: " + planResult.substring(0, Math.min(200, planResult.length())) + "... (stored in " + key + ")";
                                }
                                session.getMemory().getEpisodic().addEntry(toolLogKey, toolLogValue);
                                break;
                            }
                            default: {
                                mcpToolKit.executeTool(name, args, ctx);
                            }
                        }
                    } catch (Exception e) {
                        System.err.println("FATAL: Error executing tool '" + name + "'. Exception: " + e.getMessage());
                        e.printStackTrace(); // Print the full stack trace for debugging
                        return "Error executing tool: " + e.getMessage(); // Stop the loop and return error
                    }
                }
                continue;
            }

            if (result.getText().isPresent()) {
                return result.getText().get();
            }
        }

        return "Incomplete loop, continue needed";
    }

    // Deprecated helpers retained for potential future use
    @Deprecated
    private void planOneShot(Session session, ClonedRepo repo, Graph graph, String userPrompt) { }

    @Deprecated
    private List<Content> buildSectionContents(Session session, ClonedRepo repo, Graph graph, String userPrompt,
                                               String sectionName, String focus, List<String> nodes) { return List.of(); }

    @Deprecated
    private String combineSections(String userPrompt, Map<String, String> sectionOutputs) { return ""; }

    private String safeParams(Object p) {
        if (p == null) return "{}";
        try { return objectMapper.writeValueAsString(p); } catch (Exception e) { return "{}"; }
    }

    private List<Content> buildLoopContent(Session session, String userPrompt) {
        List<Content> contents = new ArrayList<>();
        String systemInstruction = """
You are a documentation agent. Your task is to produce excellent project documentation or answer the user's request using tools.

RULES
1. Use multiple tool calls in the same response when needed.
2. Keep responses factual and concise.
3. ALWAYS use the provided tools to gather information or perform actions; do not make up information.
4. Unless specified, you must always aim for full coverage of important nodes
5. Only if needed, retrieve source code using get_summary (The prompt must be in full sentence)

STEPS:
1. Use `get_summary(query)` to get context/summaries from the summary agent (very expensive, use with caution).
2. Use `add_plan` to add documentation subtasks, remember to hint the style (detailed, usage focused, architecture focused etc), and the related node ids
    - Example: call multiple `add_plan` in the same response to quickly add multiple documentation sections
    - You don't need to 100% sure of nodes' details, it will be provided inside the subtasks
    - CRITICAL: ALL the subtasks (plans) will be CONCATENATED DIRECTLY into a final documentation. Therefore, you MUST provide enough context so all sections can merge together smoothly
    - Example context:
        a) section index (so each section have synced index (start from 1!!), or no index)
        b) formatting & focus on eg. (usage, architecture, dependencies, purpose)
        c) long & detailed vs short & concise
3. Use `execute_plan` AFTER all sections have been completed. to run all those subtasks using dedicated agents.
    - Tips: Use different keys to cleverly organise the docs system (avoid replacing original docs unless requested).
4. Respond to user's input, describing what you did in detail (the documentation is visible to user)
""";

        contents.add(Content.builder().role("user").parts(List.of(Part.fromText(systemInstruction))).build());

        StringBuilder context = new StringBuilder();
        Memory memory = session.getMemory();

        if (memory.getPlan() != null && !memory.getPlan().isEmpty()) {
            context.append("CURRENT_PLAN:\n").append(memory.getPlan().toString()).append("\n\n");
        }

        context.append("CONFIG:\n").append(session.getAgentConfig()).append("\n\n");

        String defaultDocKey = session.getDocumentationHandler().getDefaultDocumentationKey();
        if (defaultDocKey != null) {
            context.append("DEFAULT_DOCUMENTATION_KEY: ").append(defaultDocKey).append("\n\n");
        }

        Map<String, Documentation> currentDocs = session.getDocumentation();
        if (currentDocs != null && !currentDocs.isEmpty()) {
            context.append("CURRENT_DOCUMENTATION:\n");
            for (Map.Entry<String, Documentation> entry : currentDocs.entrySet()) {
                if (entry.getValue().isExpanded()) {
                    context.append("--- START DOC: ").append(entry.getKey()).append(" ---\n");
                    context.append(entry.getValue().toString());
                    context.append("\n--- END DOC: ").append(entry.getKey()).append(" ---\n\n");
                } else {
                    String key = entry.getKey();
                    Documentation doc = entry.getValue();
                    long lineCount = doc.getContent() != null ? doc.getContent().lines().count() : 0;
                    List<String> sections = session.getDocumentationHandler().listSections(key);
                    List<String> sectionPreview = sections.stream().limit(5).collect(Collectors.toList());

                    context.append("- ").append(key).append(" ");
                    context.append("(hidden, ").append(lineCount).append(" Lines), ");
                    context.append("Preview[:5]: ");
                    if (sectionPreview.isEmpty()) {
                        context.append("No sections found");
                    } else {
                        context.append(String.join(" | ", sectionPreview));
                    }
                    context.append("\n");
                }
            }
            context.append("\n");
        }

        if (memory.getSummary() != null && !memory.getSummary().isEmpty()) {
            context.append("EXISTING SUMMARY:\n").append(memory.getSummary().toString()).append("\n\n");
        }

        if (memory.getEpisodic() != null && !memory.getEpisodic().isEmpty()) {
            context.append("LOG:\n").append(memory.getEpisodic().toString(DEFAULT_MAX_ITERATIONS * 2)).append("\n\n");
        }

        context.append("USER PROMPT:\n").append(userPrompt == null ? "" : userPrompt).append("\n\n");

        contents.add(Content.builder().role("user").parts(List.of(Part.fromText(context.toString()))).build());
        return contents;
    }

    // Executes the current plan stored in memory: generates section docs in bulk and assembles final_documentation
    public String executePlanInternal(Session session, ClonedRepo repo, Graph graph) {
        Object planObj = session.getMemory().getPlan().getRawEntry("plan");
        if (planObj == null) {
            return "No plans available";
        }

        Map<String, Map<String, Object>> plan;
        try {
            if (planObj instanceof Map) {
                plan = (Map<String, Map<String, Object>>) planObj;
            } else if (planObj instanceof String) {
                String planJson = (String) planObj;
                try {
                    plan = objectMapper.readValue(planJson, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Map<String, Object>>>(){});
                } catch (JsonProcessingException e) {
                    // If that fails, assume it's a double-encoded string and parse it twice.
                    String decodedJson = objectMapper.readValue(planJson, String.class);
                    plan = objectMapper.readValue(decodedJson, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Map<String, Object>>>(){});
                }
            } else {
                return "Plan object is not in expected format: " + planObj.getClass();
            }
        } catch (Exception e) {
            return "Plan parse failed: " + e.getMessage();
        }

        String generalSummary = session.getMemory().getSummary().getEntry("general_summary");
        String agentConfig = session.getAgentConfig().toString();

        List<AbstractMap.SimpleEntry<List<Content>, List<Tool>>> requests = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : plan.entrySet()) {
            String sectionName = entry.getKey();
            Map<String, Object> sec = entry.getValue();
            String focus = String.valueOf(sec.getOrDefault("focus", ""));
            List<String> nodes = (List<String>) sec.getOrDefault("nodes", List.of());

            // Get target nodes and ensure they have code loaded
            List<GraphNode> targetNodes = nodes.stream()
                    .map(graph::getNode)
                    .flatMap(Optional::stream)
                    .distinct()
                    .toList();

            // Get neighbor nodes and remove duplicates (nodes already in targetNodes)
            List<GraphNode> neighbourNodes = targetNodes.stream()
                    .flatMap(node -> GraphAlgo.dfsTraversal(graph, node, 1).stream())
                    .filter(node -> !targetNodes.contains(node)) // Remove duplicates
                    .distinct()
                    .toList();

            String nodeCodes = targetNodes.stream()
                    .map(node -> node.getId() + ": " + repoHandler.getCodeChunkSafe(repo, node.getId()).orElse("[Error: No code available]"))
                    .collect(Collectors.joining("\n"));
            String contextCodes = neighbourNodes.stream()
                    .map(node -> node.getId() + ": " + repoHandler.getCodeChunkSafe(repo, node.getId()).orElse("[Error: No code available]"))
                    .collect(Collectors.joining("\n"));

            String system = "You are a senior technical writer. Produce the documentation content for the given section. Accuracy is top priority.\n\n";
            String user = "This is a subtask and its related codes\n\n" +
                    (generalSummary != null && !generalSummary.isBlank() ? "PROJECT SUMMARY:\n" + generalSummary + "\n\n" : "") +
                    "NAME: " + sectionName + "\n\n" +
                    "FOCUS: " + focus + "\n\n" +
                    "RELATED CODE CHUNKS: \n" + contextCodes + "\n\n" +
                    "TARGET CODE CHUNKS: \n" + nodeCodes + "\n\n" +
                    "CONFIG:\n" + agentConfig + "\n";

            List<Content> contents = new ArrayList<>();
            contents.add(Content.builder().role("user").parts(List.of(Part.fromText(system))).build());

            contents.add(Content.builder().role("user").parts(List.of(Part.fromText(user))).build());

            requests.add(GeminiModel.createArgs(contents, List.of()));
        }

        List<SendMessageResult> results = model.sendMessageBulk(requests);
        String resultStr = results.stream()
                .flatMap(result -> result.getText().stream())
                .filter(s -> !s.isBlank())
                .collect(Collectors.joining("\n\n"));

        if (resultStr.isBlank()) {
            System.err.println("WARN: executePlanInternal - Model returned no text content for any section.");
            // Still clear the plan to avoid loops
        }

        // Correctly clear the plan after execution to prevent re-running
        session.getMemory().getPlan().clear();
        System.out.println("Plan cleared after successful execution");

        return resultStr;
    }
}
