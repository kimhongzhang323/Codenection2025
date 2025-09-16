package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.model.repo.ModelFinishReason;
import com.example.AutoDocX.model.repo.ToolCallData;
import com.example.AutoDocX.model.repo.Model;
import com.example.AutoDocX.model.repo.SendMessageResult;
import com.example.AutoDocX.parser.model.Graph;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Refactored Agent that uses the new Memory (episodic/code/structure).
 *
 * Key differences:
 * - session.getMemory() is a Memory instance with three stores
 * - Tool calls/results are logged to episodic. Code and structure stores capture trimmed successful results.
 * - If model returns both a tool call and a final_answer, we execute the tool call and still capture the final_answer.
 */
@Service
public class Agent {
    private static final int MAX_ITERATIONS = 5; // Safeguard against infinite loops
    private static final int EPISODIC_HISTORY_FOR_PROMPT = 20;
    private static final int CODE_SUMMARY_ENTRIES = 10;
    private static final int STRUCTURE_HISTORY_FOR_PROMPT = 15;

    private final RepoHandler repoHandler;
    private final McpToolbox mcpToolbox;
    private final SessionManager sessionManager;
    private final Model model;
    private final ObjectMapper objectMapper; // For formatting model params

    private final List<Tool> tools;

    public Agent(
            RepoHandler repoHandler,
            McpToolbox mcpToolbox,
            SessionManager sessionManager,
            @Qualifier("geminiModel") Model model
    ) {
        this.repoHandler = repoHandler;
        this.mcpToolbox = mcpToolbox;
        this.sessionManager = sessionManager;
        this.model = model;
        this.objectMapper = new ObjectMapper();
        this.tools = buildDefaultTools(); // init default set
    }

    public String handlePrompt(String gitUrl, String userPrompt) {
        return agentLoop(gitUrl, userPrompt);
    }

    private String agentLoop(String gitUrl, String userPrompt) {
        Session session = sessionManager.getSession(gitUrl);
        ClonedRepo repo = repoHandler.getRepo(gitUrl);
        if (repo == null) return "Repository not found.";

        Graph graph;
        try {
            graph = repoHandler.getGraph(repo);
        } catch (Exception e) {
            return "Error loading graph: " + e.getMessage();
        }

        int iterations = 0;
        String currentResponse = "";

        while (iterations++ < MAX_ITERATIONS) {
            List<Content> contents = buildContent(session.getMemory(), userPrompt);

            System.out.println("DEBUG: Sending to Gemini");
            System.out.println(formatContents(contents));

            // ✅ new structured response
            SendMessageResult result = model.sendMessageNew(contents, tools);
            System.out.println("DEBUG: Model Response\n" + result);

            // ✅ execute all tool calls if present
            if (!result.getToolCalls().isEmpty()) {
                for (ToolCallData fc : result.getToolCalls()) {
                    String toolName = fc.getName();
                    Object toolArgs = fc.getArgs();

                    System.out.println("DEBUG: Executing tool: " + toolName + " with args: " + toolArgs);
                    String toolResult = handleToolCall(toolName, toolArgs, repo, graph, session);
                    System.out.println("DEBUG: Tool result: " + toolResult);
                }
                continue;
            }

            // ✅ handle errors
            if (result.getModelFinishReason() == ModelFinishReason.OUTPUT_ERROR ||
                    result.getModelFinishReason() == ModelFinishReason.INPUT_ERROR) {
                currentResponse = "Model stopped due to " + result.getModelFinishReason();
                session.getMemory().episodic().addEntry("error:model_finish", currentResponse);
                break;
            }

            if (result.getText().isPresent()) {
                currentResponse = result.getText().get();
            } else {
                System.out.println("Model returned no usable output");
                break ;
            }

            session.getMemory().episodic().addEntry("model", currentResponse);
            break;
        }

        return getFinalResponse(session.getMemory());
    }

    /**
     * Centralized tool call handling. Also stores tool results into relevant memory stores.
     */
    private String handleToolCall(String tool, Object param, ClonedRepo repo, Graph graph, Session session) {
        String result;
        String paramForMemory;
        try {
            paramForMemory = param == null ? "null" : objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(param);
        } catch (JsonProcessingException e) {
            paramForMemory = String.valueOf(param);
        }

        try {
            result = _executeToolAndGetResult(tool, param, repo, graph, session);

            // After successful execution, store result in appropriate memory slices (with truncation where needed)
            switch (tool) {
                case "read_file":
                case "get_code":
                    session.getMemory().addCodeEntry(tool + ":" + extractNameFromParams(param), result);
                    break;
                case "get_nodes_in_file":
                case "find_central_nodes":
                case "find_neighbour_nodes":
                case "folder_tree_structure":
                    session.getMemory().addStructureEntry(tool + ":" + extractNameFromParams(param), result);
                    break;
                default:
                    // For unknown tools, at least log to episodic (already done) — avoid polluting code/structure
                    break;
            }
            session.getMemory().episodic().addEntry("model:tool_call:" + tool + "(" + paramForMemory + ")", "Success");
        } catch (Exception e) {
            result = "Error during " + tool + ": " + e.getClass().getSimpleName() + " - " + e.getMessage();
            System.err.println("DEBUG: Tool execution failed for " + tool + " with param " + paramForMemory + ". Error: " + e.getMessage());
            session.getMemory().episodic().addEntry("error:tool_call:" + tool + "(" + paramForMemory + ")", result);
        }
        return result;
    }

    /**
     * Executes tool by name and returns raw result (may be long).
     */
    @SuppressWarnings("unchecked")
    private String _executeToolAndGetResult(String tool, Object param, ClonedRepo repo, Graph graph, Session session) throws Exception {
        String result;
        Object unwrappedParam = (param instanceof Optional) ? ((Optional<?>) param).orElse(null) : param;

        // Cast params to Map
        Map<String, Object> paramsMap = (Map<String, Object>) unwrappedParam;

        switch (tool) {
            case "folder_tree_structure": {
                String folderPath = Optional.ofNullable(paramsMap.get("dirname")).map(Object::toString).orElseThrow(() -> new IllegalArgumentException("Missing dirname for folder_tree_structure tool."));
                int depth = paramsMap.containsKey("depth") ? Optional.ofNullable(paramsMap.get("depth")).map(val -> ((Number) val).intValue()).orElse(Integer.MAX_VALUE) : Integer.MAX_VALUE;
                result = mcpToolbox.folderTreeStructure(repo, folderPath, depth);
                break;
            }
            case "read_file": {
                String filenameForRead = Optional.ofNullable(paramsMap.get("filename")).map(Object::toString).orElseThrow(() -> new IllegalArgumentException("Missing filename for read_file tool."));
                result = mcpToolbox.readFile(repo, filenameForRead);
                break;
            }
            case "get_code": {
                String nodeIdForCode = Optional.ofNullable(paramsMap.get("node_id")).map(Object::toString).orElseThrow(() -> new IllegalArgumentException("Missing node_id for get_code tool."));
                result = mcpToolbox.getCode(repo, nodeIdForCode);
                break;
            }
            case "get_nodes_in_file": {
                String filePathForNodes = Optional.ofNullable(paramsMap.get("filename")).map(Object::toString).orElseThrow(() -> new IllegalArgumentException("Missing filename for get_nodes_in_file tool."));
                List<String> nodes = mcpToolbox.getNodesInFile(graph, filePathForNodes);
                result = String.join(", ", nodes);
                break;
            }
            case "find_central_nodes": {
                int n = Optional.ofNullable(paramsMap.get("n")).map(val -> ((Number) val).intValue()).orElse(5);
                result = mcpToolbox.findCentralNodes(graph, n);
                break;
            }
            case "find_neighbour_nodes": {
                String startNodeId = Optional.ofNullable(paramsMap.get("node_id")).map(Object::toString).orElseThrow(() -> new IllegalArgumentException("Missing node_id for find_neighbour_nodes tool."));
                int depthLimit = Optional.ofNullable(paramsMap.get("depth_limit")).map(val -> ((Number) val).intValue()).orElse(2);
                result = mcpToolbox.getNeighbourSubgraph(graph, startNodeId, depthLimit);
                break;
            }
            default:
                throw new IllegalArgumentException("Unknown tool: " + tool);
        }

        // also return result (episodic logging of result is done by caller)
        return result;
    }

    /**
     * Build the contents (messages) sent to the LLM.
     * Uses episodic (recent entries), summarize code memory and structure memory.
     */
    private List<Content> buildContent(Memory memory, String userPrompt) {
        List<Content> contents = new ArrayList<>();

        // === System instruction ===
        String systemInstruction =
                "You are a professional Java project documentation writer.\n" +
                        "The codebase is serialized into a code graph, showing relationships between nodes.\n" +
                        "Your task is to write complete and accurate README documentation using the provided tools.\n" +
                        "\n" +
                        "RULES:\n" +
                        "1. You MUST actively explore the codebase using the provided tools.\n" +
                        "2. NEVER assume or invent information — ALWAYS verify details (structure, purpose, usage, dependencies) directly from code or graph.\n" +
                        "3. Begin exploration from central nodes (do not ask user for hints).\n" +
                        "4. KEEP EXPLORING until you have complete knowledge to produce a final, comprehensive README.\n" +
                        "5. IMPORTANT: When exploration requires multiple queries, ALWAYS issue MULTIPLE TOOL CALLS in the SAME response instead of one by one.\n" +
                        "   - Example: If you need info from 3 files, call read_file() on all 3 files in one step.\n" +
                        "   - Example: If you need both dependency info and node details, call both tools in the same step.\n" +
                        "6. NEVER delay tool calls — batch them together whenever possible.\n" +
                        "7. Once you have gathered all info, output the README documentation as your final answer.\n";
//                        + "Available tools: " + getAvailableToolsStr() + "\n";

        contents.add(Content.builder()
                .parts(List.of(Part.builder().text(systemInstruction).build()))
                .role("user")
                .build());

        // === Code Summary ===
        String codeSummary = memory.summarizeCode(CODE_SUMMARY_ENTRIES);
        if (!codeSummary.isBlank()) {
            contents.add(Content.builder()
                    .parts(List.of(Part.builder().text("CODE SUMMARY:\n" + codeSummary).build()))
                    .role("user")
                    .build());
        }

        // === Structure Memory (recent only) ===
        List<Memory.MemoryEntry> structureEntries = memory.structure().getEntries();
        if (!structureEntries.isEmpty()) {
            StringBuilder structureSection = new StringBuilder("STRUCTURE MEMORY:\n");
            int start = Math.max(0, structureEntries.size() - STRUCTURE_HISTORY_FOR_PROMPT);
            for (int i = start; i < structureEntries.size(); i++) {
                Memory.MemoryEntry e = structureEntries.get(i);
                structureSection.append("- ").append(e.getQuery()).append(": ").append(e.getResult()).append("\n");
            }
            contents.add(Content.builder()
                    .parts(List.of(Part.builder().text(structureSection.toString()).build()))
                    .role("user")
                    .build());
        }

        // === Episodic Memory (recent only, for flow) ===
        List<Memory.MemoryEntry> episodicEntries = memory.episodic().getEntries();
        if (!episodicEntries.isEmpty()) {
            StringBuilder episodicSection = new StringBuilder("LOG MEMORY:\n");
            int start = Math.max(0, episodicEntries.size() - EPISODIC_HISTORY_FOR_PROMPT);
            for (int i = start; i < episodicEntries.size(); i++) {
                Memory.MemoryEntry e = episodicEntries.get(i);
                episodicSection.append("- ").append(e.getQuery()).append(": ").append(e.getResult()).append("\n");
            }
            contents.add(Content.builder()
                    .parts(List.of(Part.builder().text(episodicSection.toString()).build()))
                    .role("user")
                    .build());
        }

        // === Current user input ===
        contents.add(Content.builder()
                .parts(List.of(Part.builder().text(userPrompt).build()))
                .role("user")
                .build());

        return contents;
    }


    private String getFinalResponse(Memory memory) {
        // Prefer the last final_answer in episodic memory
        List<Memory.MemoryEntry> episodic = memory.episodic().getEntries();
        for (int i = episodic.size() - 1; i >= 0; i--) {
            Memory.MemoryEntry e = episodic.get(i);
            if ("model".equals(e.getQuery())) {
                return e.getResult();
            }
        }
        // Otherwise return last tool_result cached in episodic
        for (int i = episodic.size() - 1; i >= 0; i--) {
            Memory.MemoryEntry e = episodic.get(i);
            if (e.getQuery().startsWith("model:tool_call:")) {
                return e.getResult();
            }
        }
        return "No documentation generated.";
    }

    // Helper: safely extract a short name from params map for use in memory keys
    @SuppressWarnings("unchecked")
    private String extractNameFromParams(Object param) {
        if (param == null) return "null";
        Object unwrapped = (param instanceof Optional) ? ((Optional<?>) param).orElse(null) : param;
        if (unwrapped instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) unwrapped;
            if (map.containsKey("filename")) return String.valueOf(map.get("filename"));
            if (map.containsKey("node_id")) return String.valueOf(map.get("node_id"));
            if (map.containsKey("dirname")) return String.valueOf(map.get("dirname"));
            if (map.containsKey("n")) return "n=" + String.valueOf(map.get("n"));
        }
        return String.valueOf(unwrapped);
    }

    private List<Tool> buildDefaultTools() {
        List<Tool> tools = new ArrayList<>();

        tools.add(Tool.builder()
                .functionDeclarations(List.of(
                        FunctionDeclaration.builder()
                                .name("get_code")
                                .description("Retrieves the source code for a specific node (class, method, field) using graph node id. The node_id can be obtained from 'get_nodes_in_file'.")
                                .parameters(Schema.builder()
                                        .type(Type.Known.OBJECT)
                                        .properties(Map.of(
                                                "node_id", Schema.builder()
                                                        .type(Type.Known.STRING)
                                                        .description("The ID of the node (e.g., class_MyClass, method_MyClass_myMethod).")
                                                        .build()
                                        ))
                                        .required(List.of("node_id"))
                                        .build())
                                .build(),
                        FunctionDeclaration.builder()
                                .name("find_central_nodes")
                                .description("Finds the top N most central nodes in the code graph, based on the number of outgoing links.")
                                .parameters(Schema.builder()
                                        .type(Type.Known.OBJECT)
                                        .properties(Map.of(
                                                "n", Schema.builder()
                                                        .type(Type.Known.NUMBER)
                                                        .description("The number of central nodes to return.")
                                                        .build()
                                        ))
                                        .required(List.of("n"))
                                        .build())
                                .build(),
                        FunctionDeclaration.builder()
                                .name("find_neighbour_nodes")
                                .description("Performs a depth-first search on target node")
                                .parameters(Schema.builder()
                                        .type(Type.Known.OBJECT)
                                        .properties(Map.of(
                                                "node_id", Schema.builder().type(Type.Known.STRING).description("The ID of the node to start the DFS from.").build(),
                                                "depth_limit", Schema.builder().type(Type.Known.NUMBER).description("The maximum depth to traverse. Optional.").build()
                                        ))
                                        .required(List.of("node_id"))
                                        .build())
                                .build()
//                        FunctionDeclaration.builder()
//                                .name("read_file")
//                                .description("Reads the file contents of a given filename from repository root.")
//                                .parameters(Schema.builder()
//                                        .type(Type.Known.OBJECT)
//                                        .properties(Map.of(
//                                                "filename", Schema.builder().type(Type.Known.STRING).description("Path to the file relative to repo root.").build()
//                                        ))
//                                        .required(List.of("filename"))
//                                        .build())
//                                .build(),
//                        FunctionDeclaration.builder()
//                                .name("folder_tree_structure")
//                                .description("Gets the tree structure for a directory.")
//                                .parameters(Schema.builder()
//                                        .type(Type.Known.OBJECT)
//                                        .properties(Map.of(
//                                                "dirname", Schema.builder().type(Type.Known.STRING).description("Directory path relative to repo root.").build(),
//                                                "depth", Schema.builder().type(Type.Known.NUMBER).description("Depth limit for tree traversal (optional).").build()
//                                        ))
//                                        .required(List.of("dirname"))
//                                        .build())
//                                .build(),
//                        FunctionDeclaration.builder()
//                                .name("get_nodes_in_file")
//                                .description("List class nodes in a given file path.")
//                                .parameters(Schema.builder()
//                                        .type(Type.Known.OBJECT)
//                                        .properties(Map.of(
//                                                "filename", Schema.builder().type(Type.Known.STRING).description("File path relative to repo root.").build()
//                                        ))
//                                        .required(List.of("filename"))
//                                        .build())
//                                .build()
                ))
                .build());

        return tools;
    }

    private String getAvailableToolsStr() {
        List<String> toolNames = tools.stream()
                .flatMap(tool -> tool.functionDeclarations().stream())
                .flatMap(List::stream)
                .map(declaration -> declaration.name().orElse("UNKNOWN_TOOL"))
                .collect(Collectors.toList());
        return "[" + String.join(", ", toolNames) + "]";
    }

    // ---- Formatting helpers ----
    private String formatModelResponseMap(Map<String, Object> responseMap) {
        StringBuilder sb = new StringBuilder();
        if (responseMap.containsKey("final_answer")) {
            sb.append("  Final Answer: ").append(responseMap.get("final_answer")).append("\n");
        }
        if (responseMap.containsKey("tool") && responseMap.containsKey("param")) {
            String toolName = Optional.ofNullable(responseMap.get("tool")).map(Object::toString).orElse("UNKNOWN_TOOL");
            Object toolParamsRaw = responseMap.get("param");
            Object toolParams = toolParamsRaw instanceof Optional ? ((Optional<?>) toolParamsRaw).orElse(null) : toolParamsRaw;

            sb.append("  Tool Call:\n");
            sb.append("    Tool: ").append(toolName).append("\n");
            try {
                sb.append("    Parameters: ").append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(toolParams)).append("\n");
            } catch (JsonProcessingException e) {
                sb.append("    Parameters: (Error formatting JSON) ").append(toolParams).append("\n");
            }
        }
        if (!responseMap.containsKey("final_answer") && !(responseMap.containsKey("tool") && responseMap.containsKey("param"))) {
            sb.append("  Unrecognized Response: ").append(responseMap).append("\n");
        }
        return sb.toString();
    }

    private String formatContents(List<Content> contents) {
        StringBuilder sb = new StringBuilder();
        for (Content content : contents) {
            content.parts().ifPresent(parts -> {
                for (Part part : parts) {
                    part.text().ifPresent(text -> sb.append("- Text: ").append(text).append("\n"));
                    part.functionCall().ifPresent(fc -> sb.append("- Function Call: ").append(fc.name()).append("(").append(fc.args()).append(")\n"));
                }
            });
        }
        return sb.toString();
    }

//    private String formatTools(List<Tool> tools) {
//        StringBuilder sb = new StringBuilder();
//        for (Tool tool : tools) {
//            tool.functionDeclarations().ifPresent(declarations -> {
//                for (FunctionDeclaration declaration : declarations) {
//                    sb.append("  - Name: ").append(declaration.name().orElse("N/A")).append("\n");
//                    sb.append("    Description: ").append(declaration.description().orElse("N/A")).append("\n");
//                    declaration.parameters().ifPresent(schema -> {
//                        sb.append("    Parameters:\n");
//                        schema.type().ifPresent(type -> sb.append("      Type: ").append(type).append("\n"));
//                        schema.properties().ifPresent(properties -> {
//                            sb.append("      Properties:\n");
//                            properties.forEach((name, propSchema) -> {
//                                sb.append("        - ").append(name).append(": (").append(propSchema.type().orElse(new Type("Unknown"))).append(") ").append(propSchema.description().orElse("N/A")).append("\n");
//                            });
//                        });
//                        schema.required().ifPresent(required -> sb.append("      Required: ").append(required).append("\n"));
//                    });
//                }
//            });
//        }
//        return sb.toString();
//    }
}
