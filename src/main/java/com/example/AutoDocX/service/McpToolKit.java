package com.example.AutoDocX.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.FunctionDeclaration;
import com.google.genai.types.Schema;
import com.google.genai.types.Tool;
import com.google.genai.types.Type;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class McpToolKit {

    private final McpToolbox mcpToolbox;
    private final List<FunctionDeclaration> allTools;
    private final ObjectMapper objectMapper;


    public McpToolKit(McpToolbox mcpToolbox, ObjectMapper objectMapper) {
        this.mcpToolbox = mcpToolbox;
        this.allTools = initializeAllTools();
        this.objectMapper = objectMapper;
    }

    private List<FunctionDeclaration> initializeAllTools() {
        List<FunctionDeclaration> declarations = new ArrayList<>();

        declarations.add(FunctionDeclaration.builder()
                .name("get_code")
                .description("Retrieves the source code for a specific node (class, method, field) using graph node id.")
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
                .build());

        declarations.add(FunctionDeclaration.builder()
                .name("find_central_nodes")
                .description("Finds the top N most important 'hub' nodes in the code graph. Hubs are nodes that point to many other authoritative nodes, representing orchestrators or central business logic.")
                .parameters(Schema.builder()
                        .type(Type.Known.OBJECT)
                        .properties(Map.of(
                                "n", Schema.builder()
                                        .type(Type.Known.NUMBER)
                                        .description("The number of hub nodes to return.")
                                        .build()
                        ))
                        .required(List.of("n"))
                        .build())
                .build());

        declarations.add(FunctionDeclaration.builder()
                .name("find_neighbour_nodes")
                .description("Performs a depth-first search on target node to find its neighbors.")
                .parameters(Schema.builder()
                        .type(Type.Known.OBJECT)
                        .properties(Map.of(
                                "node_id", Schema.builder().type(Type.Known.STRING).description("The ID of the node to start the DFS from.").build(),
                                "depth_limit", Schema.builder().type(Type.Known.NUMBER).description("The maximum depth to traverse. Optional.").build()
                        ))
                        .required(List.of("node_id"))
                        .build())
                .build());

        declarations.add(FunctionDeclaration.builder()
                .name("summarise_code")
                .description("Add to memory a structured summary of source code retrieved with get_code")
                .parameters(Schema.builder()
                        .type(Type.Known.OBJECT)
                        .properties(Map.of(
                                "node_id", Schema.builder()
                                        .type(Type.Known.STRING)
                                        .description("The ID of the node to summarise.")
                                        .build(),
                                "description", Schema.builder()
                                        .type(Type.Known.STRING)
                                        .description("The node's brief description. Helps preserve essential context once the raw code is no longer retained.")
                                        .build()
                        ))
                        .required(List.of("node_id", "description"))
                        .build())
                .build());

        declarations.add(FunctionDeclaration.builder()
                .name("summarize_nodes_bulk")
                .description("Receives a list of nodes to summarize, and sends them to LLM in bulk to be summarized and stored in the summary memory.")
                .parameters(Schema.builder()
                        .type(Type.Known.OBJECT)
                        .properties(Map.of(
                                "node_ids", Schema.builder()
                                        .type(Type.Known.ARRAY)
                                        .description("The list of node IDs to summarize.")
                                        .items(Schema.builder().type(Type.Known.STRING).build())
                                        .build()
                        ))
                        .required(List.of("node_ids"))
                        .build())
                .build());

        return declarations;
    }

    public List<Tool> getSummaryTools() {
        List<String> summaryToolNames = List.of("get_code", "find_central_nodes", "find_neighbour_nodes", "summarise_code");
        List<FunctionDeclaration> summaryDeclarations = allTools.stream()
                .filter(tool -> summaryToolNames.contains(tool.name().orElse("")))
                .collect(Collectors.toList());
        return List.of(Tool.builder().functionDeclarations(summaryDeclarations).build());
    }

    @SuppressWarnings("unchecked")
    public String executeTool(String toolName, Object params, ToolExecutionContext context) {
        String result;
        String paramForMemory;
        try {
            paramForMemory = params == null ? "null" : objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(params);
        } catch (JsonProcessingException e) {
            paramForMemory = String.valueOf(params);
        }

        try {
            result = execute(toolName, (Map<String, Object>) params, context);

            // After successful execution, store result in appropriate memory slices (with truncation where needed)
            switch (toolName) {
                case "read_file":
                case "get_code":
                    context.getSession().getMemory().getCode().addEntry(extractNameFromParams(params), result);
                    break;
                case "get_nodes_in_file":
                case "find_neighbour_nodes":
                case "folder_tree_structure":
                case "find_central_nodes":
                    context.getSession().getMemory().getStructure().addEntry(toolName + ":" + extractNameFromParams(params), result);
                    break;
                case "summarise_code":
                case "summarize_nodes_bulk":
//					System.out.println("|    DEBUG: saving to summary memory: " + extractNameFromParams(params) + " -> " + result);
//					System.out.println("|    DEBUG: removing from code memory: " + extractNameFromParams(params));
                    context.getSession().getMemory().getSummary().addEntry(extractNameFromParams(params), result);
//                    context.getSession().getMemory().getCode().removeEntry(extractNameFromParams(params));
                    break;
                default:
                    System.out.println("WARNING: unknown tool: " + toolName + " (" + paramForMemory + ")");
                    break;
            }
            context.getSession().getMemory().getEpisodic().addEntry("model:tool_call:" + toolName + "(" + paramForMemory + ")", "Success");
        } catch (Exception e) {
            result = e.getClass().getSimpleName() + ": " + e.getMessage();
            System.err.println("DEBUG: Tool execution failed for " + toolName + " with param " + paramForMemory + ". Error: " + e.getMessage());
            context.getSession().getMemory().getEpisodic().addEntry("tool_call:" + toolName + "(" + paramForMemory + ")", result);
        }
        return result;
    }

    private String execute(String toolName, Map<String, Object> paramsMap, ToolExecutionContext context) throws Exception {
        switch (toolName) {
            case "get_code": {
                String nodeId = (String) paramsMap.get("node_id");
                return mcpToolbox.getCode(context.getRepo(), nodeId);
            }
            case "find_central_nodes": {
                int n = ((Number) paramsMap.getOrDefault("n", 10)).intValue();
                return mcpToolbox.findCentralNodesByPageRank(context.getGraph(), n);
            }
            case "find_neighbour_nodes": {
                String nodeId = (String) paramsMap.get("node_id");
                int depth = ((Number) paramsMap.getOrDefault("depth_limit", 2)).intValue();
                return mcpToolbox.getNeighbourSubgraph(context.getGraph(), nodeId, depth);
            }
            case "summarise_code": {
                String nodeId = (String) paramsMap.get("node_id");
                String description = (String) paramsMap.get("description");
                return mcpToolbox.compactNode(context.getGraph(), nodeId, description);
            }
            case "summarize_nodes_bulk": {
                List<String> nodeIds = (List<String>) paramsMap.get("node_ids");
                return mcpToolbox.summarizeNodesBulk(context.getGraph(), nodeIds, context.getSession());
            }
            default:
                throw new IllegalArgumentException("Unknown tool: " + toolName);
        }
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
            if (map.containsKey("code")) return "code_snippet";
        }
        return String.valueOf(unwrapped);
    }
}
