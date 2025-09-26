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

    private final McpToolUtils mcpToolUtils;
    private final List<FunctionDeclaration> allTools;
    private final ObjectMapper objectMapper;
    

    public McpToolKit(McpToolUtils mcpToolUtils, ObjectMapper objectMapper) {
        this.mcpToolUtils = mcpToolUtils;
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

    declarations.add(FunctionDeclaration.builder()
        .name("update_understanding")
        .description("Replace or create the 'understanding' entry in summary memory with the current plan/understanding and next actions.")
        .parameters(Schema.builder()
            .type(Type.Known.OBJECT)
            .properties(Map.of(
                "text", Schema.builder()
                    .type(Type.Known.STRING)
                    .description("Short plan: current understanding of the project and what to do next.")
                    .build()
            ))
            .required(List.of("text"))
            .build())
        .build());

    // Documentation Agent (KISS) toolset: get_summary, update_plan, execute_plan
    declarations.add(FunctionDeclaration.builder()
        .name("get_summary")
        .description("Retrieves related context from the codebase. Leave the query is empty to generate a project-level summary")
        .parameters(Schema.builder()
            .type(Type.Known.OBJECT)
            .properties(Map.of(
                "query", Schema.builder().type(Type.Known.STRING).description("Prompt passed to the Summarising Agent. Leave empty for a general project summary.").build()
            ))
            .build())
        .build());

    declarations.add(FunctionDeclaration.builder()
        .name("add_plan")
        .description("Adds an item to the overall plan. " +
                "Each item will be executed in parallel by sub-workers with access to the relevant code nodes. " +
                "Use the `focus` parameter to control the style or perspective (e.g., detailed, concise, architecture-focused, usage-focused).")
        .parameters(Schema.builder()
            .type(Type.Known.OBJECT)
            .properties(Map.of(
                "name", Schema.builder()
                        .type(Type.Known.STRING)
                        .description("The name or title of this plan item.")
                        .build(),
                "focus", Schema.builder()
                        .type(Type.Known.STRING)
                        .description("The focus or style for generating this item (e.g., detailed, concise, architecture, usage).")
                        .build(),
                "nodes", Schema.builder()
                        .type(Type.Known.ARRAY)
                        .items(Schema.builder().type(Type.Known.STRING).build())
                        .description("The list of node IDs that this item should consider.")
                        .build()
            ))
            .required(List.of("name", "focus", "nodes"))
            .build())
        .build());

    declarations.add(FunctionDeclaration.builder()
        .name("execute_plan")
        .description("Execute the current plan: generate all section docs in parallel and compose the final documentation. Stores final_documentation in memory and returns it.")
            .parameters(Schema.builder()
                .type(Type.Known.OBJECT)
                .properties(Map.of(
                    "key", Schema.builder()
                        .type(Type.Known.STRING)
                        .description("The key under which the final documentation will be saved.")
                        .build()
                ))
                .required(List.of("key"))
                .build())
        .build());

    declarations.add(FunctionDeclaration.builder()
        .name("update_documentation")
        .description("Write or replace the current assembled documentation text into summary memory under key 'documentation'.")
        .parameters(Schema.builder()
            .type(Type.Known.OBJECT)
            .properties(Map.of(
                "content", Schema.builder().type(Type.Known.STRING).description("Full or partial documentation content to store.").build()
            ))
            .required(List.of("content"))
            .build())
        .build());

    declarations.add(FunctionDeclaration.builder()
        .name("replace_string_in_doc")
        .description("Replaces all occurrences of a specific string within a documentation entry.")
        .parameters(Schema.builder()
            .type(Type.Known.OBJECT)
            .properties(Map.of(
                "key", Schema.builder().type(Type.Known.STRING).description("The key of the documentation entry to modify.").build(),
                "old_string", Schema.builder().type(Type.Known.STRING).description("The exact string to be replaced.").build(),
                "new_string", Schema.builder().type(Type.Known.STRING).description("The string to replace with.").build()
            ))
            .required(List.of("key", "old_string", "new_string"))
            .build())
        .build());

    declarations.add(FunctionDeclaration.builder()
        .name("insert_into_doc")
        .description("Inserts a string into a documentation entry, either at the beginning or after a specified marker.")
        .parameters(Schema.builder()
            .type(Type.Known.OBJECT)
            .properties(Map.of(
                "key", Schema.builder().type(Type.Known.STRING).description("The key of the documentation entry to modify.").build(),
                "content_to_insert", Schema.builder().type(Type.Known.STRING).description("The content to insert.").build(),
                "after_string", Schema.builder().type(Type.Known.STRING).description("Optional. The string after which the content should be inserted. If empty, inserts at the beginning.").build()
            ))
            .required(List.of("key", "content_to_insert"))
            .build())
        .build());

    declarations.add(FunctionDeclaration.builder()
        .name("read_doc")
        .description("Marks a documentation entry as 'expanded' for a specified number of agent iterations, making its full content visible in the context.")
        .parameters(Schema.builder()
            .type(Type.Known.OBJECT)
            .properties(Map.of(
                "key", Schema.builder().type(Type.Known.STRING).description("The key of the documentation entry to expand.").build(),
                "countdown", Schema.builder().type(Type.Known.NUMBER).description("The number of turns to keep the document expanded.").build()
            ))
            .required(List.of("key", "countdown"))
            .build())
        .build());

        return declarations;
    }

    public List<Tool> getExplorationTools() {
        List<String> names = List.of("get_code", "find_neighbour_nodes", "update_understanding");
        return buildTools(names);
    }

    // KISS: unified agent tools
    public List<Tool> getDocumentationAgentTools() {
        List<String> names = List.of("get_summary", "add_plan", "execute_plan", "replace_string_in_doc", "insert_into_doc", "read_doc");
        return buildTools(names);
    }

    private List<Tool> buildTools(List<String> names) {
    List<FunctionDeclaration> decls = allTools.stream()
        .filter(tool -> names.contains(tool.name().orElse("")))
        .collect(Collectors.toList());
    return List.of(Tool.builder().functionDeclarations(decls).build());
    }

    @SuppressWarnings("unchecked")
    public String executeTool(String toolName, Map<String, Object> params, ToolExecutionContext context) {
        String result;
        String paramForMemory;
        try {
            paramForMemory = params == null ? "null" : objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(params);
        } catch (JsonProcessingException e) {
            paramForMemory = String.valueOf(params);
        }

        try {
            result = execute(toolName, params, context);

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
                    context.getSession().getMemory().getSummary().addEntry(extractNameFromParams(params), result);
                    context.getSession().getMemory().getCode().removeEntry(extractNameFromParams(params));
                    break;
                case "summarize_nodes_bulk":
                case "add_plan":
                case "execute_plan":
                case "update_documentation":
                case "replace_string_in_doc":
                case "insert_into_doc":
                case "read_doc":
                    // handled internally; nothing to store synchronously here
                    break;
                case "update_understanding":
                    context.getSession().getMemory().getSummary().replaceEntry("understanding", result);
                    context.getSession().getMemory().getEpisodic().addEntry("model:tool_call:" + toolName + "(" + "..." + ")", "Success");
                    return result;
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
                return mcpToolUtils.getCode(context.getRepo(), nodeId);
            }
            case "find_central_nodes": {
                int n = ((Number) paramsMap.getOrDefault("n", 10)).intValue();
                return mcpToolUtils.findCentralNodesByPageRank(context.getGraph(), n);
            }
            case "find_neighbour_nodes": {
                String nodeId = (String) paramsMap.get("node_id");
                int depth = ((Number) paramsMap.getOrDefault("depth_limit", 2)).intValue();
                return mcpToolUtils.getNeighbourSubgraph(context.getGraph(), nodeId, depth);
            }
            case "summarise_code": {
                String nodeId = (String) paramsMap.get("node_id");
                String description = (String) paramsMap.get("description");
                return mcpToolUtils.compactNode(context.getGraph(), nodeId, description);
            }
            case "summarize_nodes_bulk": {
                List<String> nodeIds = (List<String>) paramsMap.get("node_ids");
                return mcpToolUtils.summarizeNodesBulk(context.getGraph(), nodeIds, context.getSession());
            }
            case "update_understanding": {
                String text = (String) paramsMap.get("text");
                return mcpToolUtils.updateUnderstanding(context.getSession(), text);
            }
            case "add_plan": {
                String sectionName = (String) paramsMap.get("name");
                String focus = (String) paramsMap.get("focus");
                List<String> nodes = (List<String>) paramsMap.get("nodes");
                return mcpToolUtils.addSectionPlan(context.getSession(), sectionName, focus, nodes);
            }
            case "update_documentation": {
                String content = String.valueOf(paramsMap.getOrDefault("content", ""));
                return mcpToolUtils.updateDocumentation(context.getSession(), content);
            }
            case "replace_string_in_doc": {
                String key = (String) paramsMap.get("key");
                String oldString = (String) paramsMap.get("old_string");
                String newString = (String) paramsMap.get("new_string");
                return mcpToolUtils.replaceStringInDoc(context.getSession(), key, oldString, newString);
            }
            case "insert_into_doc": {
                String key = (String) paramsMap.get("key");
                String contentToInsert = (String) paramsMap.get("content_to_insert");
                String afterString = (String) paramsMap.get("after_string");
                return mcpToolUtils.insertIntoDoc(context.getSession(), key, contentToInsert, afterString);
            }
            case "read_doc": {
                String key = (String) paramsMap.get("key");
                int countdown = ((Number) paramsMap.get("countdown")).intValue();
                return mcpToolUtils.readDoc(context.getSession(), key, countdown);
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
