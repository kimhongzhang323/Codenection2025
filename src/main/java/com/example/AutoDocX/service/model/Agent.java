package com.example.AutoDocX.service.model;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.model.repo.Model;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.service.McpToolbox;
import com.example.AutoDocX.service.RepoHandler;
import com.example.AutoDocX.service.Session;
import com.example.AutoDocX.service.SessionManager;
import com.example.AutoDocX.service.memory.Memory;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

@Service
public class Agent {
    private final RepoHandler repoHandler;
    private final McpToolbox mcpToolbox;
    private final SessionManager sessionManager;
    private final Model model;
    private final ObjectMapper objectMapper; // Add ObjectMapper
    private static final int MAX_ITERATIONS = 5; // Safeguard against infinite loops

    public Agent(RepoHandler repoHandler, McpToolbox mcpToolbox, SessionManager sessionManager, Model model) {
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
        if (repo == null) return "Repository not found.";
        Graph graph;
        try {
            graph = repoHandler.getGraph(repo);
        } catch (Exception e) {
            return "Error loading graph: " + e.getMessage();
        }

        AtomicInteger iterations = new AtomicInteger(0);
        String currentResponse = "";

        while (iterations.getAndIncrement() < MAX_ITERATIONS) {
            String context = buildContext(session, userPrompt);
            String modelResponse = model.sendMessage(context);

            try {
                Map<String, Object> jsonResponse = objectMapper.readValue(modelResponse, Map.class);

                if (jsonResponse.containsKey("tool") && jsonResponse.containsKey("param")) {
                    String tool = (String) jsonResponse.get("tool");
                    String param = (String) jsonResponse.get("param");
                    currentResponse = handleToolCall(tool, param, repo, graph, session);
                } else if (jsonResponse.containsKey("final_answer")) {
                    currentResponse = (String) jsonResponse.get("final_answer");
                    session.getMemory().addEntry("system_final_answer", "final_documentation", currentResponse);
                    break; // Exit loop, we have the final answer
                } else {
                    currentResponse = "Model returned unrecognized JSON format: " + modelResponse;
                    session.getMemory().addEntry("system_error", "unrecognized_json", currentResponse);
                    break;
                }
            } catch (Exception e) {
                currentResponse = "Error parsing model response as JSON: " + e.getMessage() + ". Raw response: " + modelResponse;
                session.getMemory().addEntry("system_error", "json_parsing_error", currentResponse);
                break; // Exit loop on JSON parsing error
            }
        }
        return getFinalResponse(session);
    }

    private String handleToolCall(String tool, String param, ClonedRepo repo, Graph graph, Session session) throws Exception {
        String result;
        session.getMemory().addEntry("system_tool_query", tool, param);
        switch (tool) {
            case "get-code":
                result = mcpToolbox.getCode(repo, param);
                break;
            case "find-direct-connections":
                result = mcpToolbox.findDirectConnections(graph, param);
                break;
            case "folder-tree-structure":
                result = mcpToolbox.folderTreeStructure(repo, param);
                break;
            case "get-nodes-in-file":
                List<String> nodes = mcpToolbox.getNodesInFile(graph, param);
                result = String.join(", ", nodes);
                break;
            default:
                throw new IllegalArgumentException("Unknown tool: " + tool);
        }
        session.getMemory().addEntry("system_tool_output", tool + "_result", result);
        return result;
    }

    private String buildContext(Session session, String userPrompt) {
        StringBuilder sb = new StringBuilder();
        // sb.append("[system - persona - tools - query memory - user input]\n");
        sb.append("system: You are a professional documentation writer. Your task is to write clear and concise documentation using the provided tools. Respond in JSON format only.\n");
        sb.append("tools:\n");
        sb.append("- get-code(nodeIdOrLabel): Retrieves the source code for a specific node (class, method, field) from the cloned repository. Example tool call: {\"tool\": \"get-code\", \"param\": \"class_MyClass\"}\n");
        sb.append("- find-direct-connections(nodeIdOrLabel): Explores the direct relationships (outgoing links) of a node within the code graph. Example tool call: {\"tool\": \"find-direct-connections\", \"param\": \"method_MyClass_myMethod\"}\n");
        sb.append("- folder-tree-structure(folderPath): Retrieves the tree structure of a folder in the repository. Example tool call: {\"tool\": \"folder-tree-structure\", \"param\": \"src/main/java/com/example/AutoDocX\"}\n");
        sb.append("- get-nodes-in-file(filePath): Returns the top-level nodes (classes) in a specific file. Example tool call: {\"tool\": \"get-nodes-in-file\", \"param\": \"src/main/java/com/example/AutoDocX/controller/AgentController.java\"}\n");
        sb.append("When you have enough information to provide a final documentation, respond with a JSON object containing a 'final_answer' field. Example final answer: {\"final_answer\": \"The GameEngine class manages the core game loop...\"}\n");
        sb.append("query memory:\n");
        for (Memory.MemoryEntry entry : session.getMemory().getEntries()) {
            sb.append("  system: ").append(entry.getSystem()).append(" | query: ").append(entry.getQueryMemory()).append(" | user: ").append(entry.getUserInput()).append("\n");
        }
        sb.append("user input: ").append(userPrompt);
        return sb.toString();
    }

    private String getFinalResponse(Session session) {
        Optional<Memory.MemoryEntry> lastEntry = session.getMemory().getEntries().stream()
                .filter(entry -> entry.getSystem().equals("system_final_answer") || entry.getSystem().equals("system_tool_output"))
                .reduce((first, second) -> second);

        return lastEntry.map(entry -> entry.getUserInput()).orElse("No documentation generated.");
    }
}
