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

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class Agent {
    private static final int MAX_ITERATIONS = 5; // Safeguard against infinite loops
    private final RepoHandler repoHandler;
    private final McpToolbox mcpToolbox;
    private final SessionManager sessionManager;
    private final Model model;
    private final ObjectMapper objectMapper; // Add ObjectMapper

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
            String context = buildContext(session, userPrompt);
            System.out.println("DEBUG: Context sent to LLM:\n" + context);
            String modelResponse = model.sendMessage(context);
            System.out.println("DEBUG: Raw response from LLM:\n" + modelResponse);

            try {
                Map<String, Object> jsonResponse = objectMapper.readValue(modelResponse, Map.class);
                System.out.println("DEBUG: Parsed JSON response from LLM:\n" + jsonResponse);

                if (jsonResponse.containsKey("final_answer")) {
                    currentResponse = (String) jsonResponse.get("final_answer");
                    System.out.println("DEBUG: LLM provided final answer:\n" + currentResponse);
                    session.getMemory().addEntry("final_answer", currentResponse);
                    break; // Exit loop, we have the final answer
                } else if (jsonResponse.containsKey("tool") && jsonResponse.containsKey("param")) {
                    String tool = (String) jsonResponse.get("tool");
                    String param = (String) jsonResponse.get("param");
                    System.out.println("DEBUG: LLM chose tool: " + tool + " with param: " + param);
                    session.getMemory().addEntry("tool_call:" + tool, param);
                    handleToolCall(tool, param, repo, graph, session);
                } else {
                    currentResponse = "Model returned unrecognized JSON format: " + modelResponse;
                    System.out.println("DEBUG: Unrecognized JSON format.\n" + currentResponse);
                    session.getMemory().addEntry("error:unrecognized_json", currentResponse);
                    break;
                }
            } catch (Exception e) {
                currentResponse = "Error parsing model response as JSON: " + e.getMessage() + ". Raw response: " + modelResponse;
                System.out.println("DEBUG: JSON parsing error.\n" + currentResponse);
                session.getMemory().addEntry("error:json_parsing_error", currentResponse);
                break; // Exit loop on JSON parsing error
            }
        }
        return getFinalResponse(session);
    }

    private String handleToolCall(String tool, String param, ClonedRepo repo, Graph graph, Session session) throws Exception {
        String result;

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

        // Store the tool's result in memory
        session.getMemory().addEntry("tool_result:" + tool, result);
        return result;
    }

    private String buildContext(Session session, String userPrompt) {
        StringBuilder sb = new StringBuilder();
        // sb.append("[system - persona - tools - query memory - user input]\n");
        sb.append("system:\nYou are a professional documentation writer. Your task is to write clear and concise documentation using the provided tools.\n");
        sb.append("tools:\n");
        sb.append("- get-code(nodeIdOrLabel): Retrieves the source code for a specific node (class, method, field) from the cloned repository. Example tool call: {\"tool\": \"get-code\", \"param\": \"class_MyClass\"}.\n");
        sb.append("- find-direct-connections(nodeIdOrLabel): Explores the direct relationships (outgoing links) of a node within the code graph. Example tool call: {\"tool\": \"find-direct-connections\", \"param\": \"method_MyClass_myMethod\"}.\n");
        sb.append("- folder-tree-structure(folderPath): Retrieves the tree structure of a folder within the cloned repository. The folderPath must be relative to the repository root (e.g., \"src/main/java\"). Example tool call: {\"tool\": \"folder-tree-structure\", \"param\": \"src/main/java/com/example/AutoDocX\"}.\n");
        sb.append("- get-nodes-in-file(filePath): Returns the top-level nodes (classes) in a specific file. Example tool call: {\"tool\": \"get-nodes-in-file\", \"param\": \"src/main/java/com/example/AutoDocX/controller/AgentController.java\"}.\n");
        sb.append("When you already have enough information or if a tool is not required to provide a final documentation, respond with a JSON object containing a 'final_answer' field. Example final answer: {\"final_answer\": \"The GameEngine class manages the core game loop...\"}\n");
        sb.append("All user queries should be answered after the actual documentation\n");
        sb.append("query memory:\n");
        for (Memory.MemoryEntry entry : session.getMemory().getEntries()) {
            sb.append("  Query: ").append(entry.getQuery()).append(" | Result: ").append(entry.getResult()).append("\n");
        }
        sb.append("user input: ").append(userPrompt);
        return sb.toString();
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
}
