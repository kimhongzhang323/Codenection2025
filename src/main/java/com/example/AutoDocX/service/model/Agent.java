package com.example.AutoDocX.service.model;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.model.repo.Model;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.service.McpToolbox;
import com.example.AutoDocX.service.RepoHandler;
import com.example.AutoDocX.service.Session;
import com.example.AutoDocX.service.SessionManager;
import com.example.AutoDocX.service.memory.Memory;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Qualifier; // Import Qualifier

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.json.JSONObject; // Import JSONObject
import com.google.genai.types.Content;
import com.google.genai.types.Tool;
import com.google.genai.types.FunctionDeclaration; // Added
import com.google.genai.types.Schema;              // Added
import com.google.genai.types.Type;                 // Added
import com.google.genai.types.Part;
import java.util.ArrayList;
import java.util.Arrays;
// Added for Map.of
import java.util.stream.Collectors; // Added for Collectors
import com.fasterxml.jackson.core.JsonProcessingException; // Added for JsonProcessingException


@Service
public class Agent {
    private static final int MAX_ITERATIONS = 5; // Safeguard against infinite loops
    private final RepoHandler repoHandler;
    private final McpToolbox mcpToolbox;
    private final SessionManager sessionManager;
    private final Model model;
    private final ObjectMapper objectMapper; // Add ObjectMapper

    public Agent(RepoHandler repoHandler, McpToolbox mcpToolbox, SessionManager sessionManager, @Qualifier("geminiModel") Model model) {
        this.repoHandler = repoHandler;
        this.mcpToolbox = mcpToolbox;
        this.sessionManager = sessionManager;
        this.model = model;
        this.objectMapper = new ObjectMapper(); // Initialize ObjectMapper
    }

    public String handlePrompt(String gitUrl, String userPrompt) {
        return agentLoop(gitUrl, userPrompt);
    }

    private String agentLoop(String gitUrl, String userPrompt) {
        Session session = sessionManager.getSession(gitUrl);
        ClonedRepo repo = repoHandler.getRepo(gitUrl);
        if (repo == null)
            return "Repository not found.";

        Graph graph;
        try {
            graph = repoHandler.getGraph(repo);
        } catch (Exception e) {
            return "Error loading graph: " + e.getMessage();
        }

        AtomicInteger iterations = new AtomicInteger(0);
        String currentResponse = "";

        while (iterations.getAndIncrement() < MAX_ITERATIONS) {
            List<Tool> tools = getTools();
            List<Content> contents = buildContent(session, userPrompt);
            System.out.println("DEBUG: Context (Contents) sent to LLM:\n" + formatContents(contents));
            System.out.println("DEBUG: Context (Tools) sent to LLM:\n" + formatTools(tools));

            Map<String, Object> modelResponseMap = model.sendMessage(contents, tools);
            System.out.println("DEBUG: Parsed response from LLM:\n" + formatModelResponseMap(modelResponseMap));

            try {
                if (modelResponseMap.containsKey("final_answer")) {
                    currentResponse = (String) modelResponseMap.get("final_answer");
                    System.out.println("DEBUG: LLM provided final answer:\n" + currentResponse);
                    session.getMemory().addEntry("final_answer", currentResponse);
                    break; // Exit loop, we have the final answer
                } else if (modelResponseMap.containsKey("tool") && modelResponseMap.containsKey("param")) {
                    String toolNameRaw = Optional.ofNullable(modelResponseMap.get("tool")).map(Object::toString).orElse("UNKNOWN_TOOL");
                    String toolName = toolNameRaw.startsWith("Optional[") && toolNameRaw.endsWith("]") ? toolNameRaw.substring(9, toolNameRaw.length() - 1) : toolNameRaw; // Explicitly unwrap if it's still wrapped

                    Object toolParamsRaw = modelResponseMap.get("param");
                    Object toolParams = toolParamsRaw instanceof Optional ? ((Optional<?>) toolParamsRaw).orElse(null) : toolParamsRaw;

                    System.out.println("DEBUG: LLM chose tool: " + toolName + " with param: " + toolParams);
                    String toolResult = handleToolCall(toolName, toolParams, repo, graph, session); // Get the actual result
                    System.out.println("DEBUG: Tool \"" + toolName + "\" executed. Result:\n" + toolResult);
                    currentResponse = toolResult; // Update currentResponse with the actual tool result
                } else {
                    currentResponse = "Model returned unrecognized JSON format: " + formatModelResponseMap(modelResponseMap);
                    System.out.println("DEBUG: Unrecognized JSON format.\n" + currentResponse);
                    session.getMemory().addEntry("error:unrecognized_json", currentResponse);
                    break;
                }
            } catch (Exception e) {
                currentResponse = "Error parsing model response as JSON: " + e.getMessage() + ". Raw response: " + formatModelResponseMap(modelResponseMap);
                System.out.println("DEBUG: JSON parsing error.\n" + currentResponse);
                session.getMemory().addEntry("error:json_parsing_error", currentResponse);
                break; // Exit loop on JSON parsing error
            }
        }
        return getFinalResponse(session);
    }

    private String handleToolCall(String tool, Object param, ClonedRepo repo, Graph graph, Session session) {
        String result;
        try {
            // Convert param to String for memory logging, handling both String and Map types, and unwrapping Optional
            String paramForMemory = (param instanceof Optional) ? ((Optional<?>) param).map(Object::toString).orElse("null") : (param instanceof String) ? (String) param : objectMapper.writeValueAsString(param);
            session.getMemory().addEntry("tool_call:" + tool, paramForMemory);
            result = _executeToolAndGetResult(tool, param, repo, graph, session);
        } catch (Exception e) {
            String paramString = (param instanceof Optional) ? ((Optional<?>) param).map(Object::toString).orElse("null") : (param instanceof String) ? (String) param : param.toString();
            result = "Error during " + tool + ": " + e.getClass().getSimpleName() + " - " + e.getMessage();
            System.err.println("DEBUG: Tool execution failed for " + tool + " with param " + paramString + ". Error: " + e.getMessage());
            session.getMemory().addEntry("error:tool_execution:" + tool, result);
        }
        return result;
    }

    private String _executeToolAndGetResult(String tool, Object param, ClonedRepo repo, Graph graph, Session session) throws Exception {
        String result;
        Object unwrappedParam = (param instanceof Optional) ? ((Optional<?>) param).orElse(null) : param;

        switch (tool) {
            case "get-code":
                result = mcpToolbox.getCode(repo, (String) unwrappedParam);
                break;
            case "find-direct-connections":
                result = mcpToolbox.findDirectConnections(graph, (String) unwrappedParam);
                break;
            case "folder-tree-structure":
                JSONObject folderTreeParams = new JSONObject((Map<String, Object>) unwrappedParam);
                String folderPath = folderTreeParams.getString("folderPath");
                int depth = folderTreeParams.optInt("depth", Integer.MAX_VALUE); // Default to MAX_VALUE if not provided
                result = mcpToolbox.folderTreeStructure(repo, folderPath, depth);
                break;
            case "read-file":
                result = mcpToolbox.readFile(repo, (String) unwrappedParam);
                break;
            case "get-nodes-in-file":
                List<String> nodes = mcpToolbox.getNodesInFile(graph, (String) unwrappedParam);
                result = String.join(", ", nodes);
                break;
            default:
                throw new IllegalArgumentException("Unknown tool: " + tool);
        }
        // Store the tool's successful result in memory
        session.getMemory().addEntry("tool_result:" + tool, result);
        return result;
    }

    private List<Tool> getTools() {
        List<Tool> tools = new ArrayList<>();

        // folder-tree-structure
        tools.add(Tool.builder()
                .functionDeclarations(FunctionDeclaration.builder()
                        .name("folder-tree-structure")
                        .description("Retrieves the tree structure of a folder within the cloned repository up to a specified depth. The folderPath must be relative to the repository root (e.g., \"src/main/java\"). The depth parameter is optional, if not provided, it will traverse the entire directory. All paths should be relative to the repository root.")
                        .parameters(Schema.builder()
                                .type(Type.Known.OBJECT)
                                .properties(Map.of(
                                        "folderPath", Schema.builder().type(Type.Known.STRING).description("The path to the folder, relative to the repository root.").build(),
                                        "depth", Schema.builder().type(Type.Known.NUMBER).description("The maximum depth to traverse. Optional. If not provided, it will traverse the entire directory.").build()
                                ))
                                .required(List.of("folderPath"))
                                .build())
                        .build()).build());

        // read-file
        tools.add(Tool.builder()
                .functionDeclarations(FunctionDeclaration.builder()
                        .name("read-file")
                        .description("Reads the content of a specified file within the cloned repository. The filePath must be relative to the repository root (e.g., \"src/main/java/com/example/AutoDocX/controller/AgentController.java\"). All paths should be relative to the repository root.")
                        .parameters(Schema.builder()
                                .type(Type.Known.OBJECT)
                                .properties(Map.of("filePath", Schema.builder().type(Type.Known.STRING).description("The path to the file, relative to the repository root.").build()))
                                .required(List.of("filePath"))
                                .build())
                        .build()).build());

        // get-nodes-in-file
        tools.add(Tool.builder()
                .functionDeclarations(FunctionDeclaration.builder()
                        .name("get-nodes-in-file")
                        .description("Returns the top-level nodes (classes) in a specific file. The filePath must be relative to the repository root (e.g., \"src/main/java/com/example/AutoDocX/controller/AgentController.java\"). All paths should be relative to the repository root.")
                        .parameters(Schema.builder()
                                .type(Type.Known.OBJECT)
                                .properties(Map.of("filePath", Schema.builder().type(Type.Known.STRING).description("The path to the file, relative to the repository root.").build()))
                                .required(List.of("filePath"))
                                .build())
                        .build()).build());

        // get-code
        tools.add(Tool.builder()
                .functionDeclarations(FunctionDeclaration.builder()
                        .name("get-code")
                        .description("Retrieves the source code for a specific node (class, method, field) using node id. The nodeIdOrLabel can be obtained from 'get-nodes-in-file' or 'find-direct-connections'. All paths should be relative to the repository root.")
                        .parameters(Schema.builder()
                                .type(Type.Known.OBJECT)
                                .properties(Map.of("nodeIdOrLabel", Schema.builder().type(Type.Known.STRING).description("The ID or label of the node (e.g., class_MyClass, method_MyClass_myMethod).").build()))
                                .required(List.of("nodeIdOrLabel"))
                                .build())
                        .build()).build());

        // find-direct-connections
        tools.add(Tool.builder()
                .functionDeclarations(FunctionDeclaration.builder()
                        .name("find-direct-connections")
                        .description("Explores the direct relationships (outgoing links) of a node within the code graph using node id. The nodeIdOrLabel can be obtained from 'get-nodes-in-file' or 'get-code'. All paths should be relative to the repository root.")
                        .parameters(Schema.builder()
                                .type(Type.Known.OBJECT)
                                .properties(Map.of("nodeIdOrLabel", Schema.builder().type(Type.Known.STRING).description("The ID or label of the node (e.g., class_MyClass, method_MyClass_myMethod).").build()))
                                .required(List.of("nodeIdOrLabel"))
                                .build())
                        .build()).build());

        return tools;
    }

    private List<Content> buildContent(Session session, String userPrompt) {
        List<Content> contents = new ArrayList<>();

        // System instructions
        StringBuilder systemInstruction = new StringBuilder();
        systemInstruction.append("You are a professional documentation writer.");
        systemInstruction.append("The codebase is serialised into a code graph, showing relationship between nodes.");
        systemInstruction.append("Your task is to write clear and concise documentation using the provided tools.");
        contents.add(Content.builder().parts(Arrays.asList(Part.builder().text(systemInstruction.toString()).build())).role("model").build());

        // Query memory
        for (Memory.MemoryEntry entry : session.getMemory().getEntries()) {
            contents.add(Content.builder().parts(Arrays.asList(Part.builder().text("Query: " + entry.getQuery() + " | Result: " + entry.getResult()).build())).role("model").build());
        }

        // User input
        contents.add(Content.builder().parts(Arrays.asList(Part.builder().text("user input: " + userPrompt).build())).role("user").build());

        return contents;
    }

    private String buildContext(Session session, String userPrompt) {
        // This method is no longer used, but keeping it for now to avoid compilation errors.
        // The logic has been moved to getTools() and buildContent().
        return "";
    }

    private String getFinalResponse(Session session) {
        Optional<Memory.MemoryEntry> finalAnswerEntry = session.getMemory().getEntries().stream().filter(entry -> entry.getQuery().equals("final_answer")).reduce((first, second) -> second);

        if (finalAnswerEntry.isPresent()) {
            return finalAnswerEntry.get().getResult();
        } else {
            // If no final_answer, return the result of the last successful tool call
            Optional<Memory.MemoryEntry> lastToolResultEntry = session.getMemory().getEntries().stream().filter(entry -> entry.getQuery().startsWith("tool_result:")).reduce((first, second) -> second);
            return lastToolResultEntry.map(Memory.MemoryEntry::getResult).orElse("No documentation generated.");
        }
    }

    private String formatModelResponseMap(Map<String, Object> responseMap) {
        StringBuilder sb = new StringBuilder();
        if (responseMap.containsKey("final_answer")) {
            sb.append("  Final Answer: ").append(responseMap.get("final_answer")).append("\n");
        } else if (responseMap.containsKey("tool") && responseMap.containsKey("param")) {
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
        } else {
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

    private String formatTools(List<Tool> tools) {
        StringBuilder sb = new StringBuilder();
        for (Tool tool : tools) {
            tool.functionDeclarations().ifPresent(declarations -> {
                for (FunctionDeclaration declaration : declarations) {
                    sb.append("  - Name: ").append(declaration.name().orElse("N/A")).append("\n");
                    sb.append("    Description: ").append(declaration.description().orElse("N/A")).append("\n");
                    declaration.parameters().ifPresent(schema -> {
                        sb.append("    Parameters:\n");
                        schema.type().ifPresent(type -> sb.append("      Type: ").append(type).append("\n"));
                        schema.properties().ifPresent(properties -> {
                            sb.append("      Properties:\n");
                            properties.forEach((name, propSchema) -> {
                                sb.append("        - ").append(name).append(": (").append(propSchema.type().orElse(new Type("Unknown"))).append(") ").append(propSchema.description().orElse("N/A")).append("\n");
                            });
                        });
                        schema.required().ifPresent(required -> sb.append("      Required: ").append(required).append("\n"));
                    });
                }
            });
        }
        return sb.toString();
    }
}