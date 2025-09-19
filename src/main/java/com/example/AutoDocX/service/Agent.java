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
    private final SummaryAgent summaryAgent;
    private final McpToolKit mcpToolKit;


    public Agent(
            RepoHandler repoHandler,
            McpToolbox mcpToolbox,
            SessionManager sessionManager,
            @Qualifier("geminiCentral") Model model,
            SummaryAgent summaryAgent,
            McpToolKit mcpToolKit
    ) {
        this.repoHandler = repoHandler;
        this.mcpToolbox = mcpToolbox;
        this.sessionManager = sessionManager;
        this.model = model;
        this.summaryAgent = summaryAgent;
        this.mcpToolKit = mcpToolKit;
        this.objectMapper = new ObjectMapper();
    }

    public String handlePrompt(String gitUrl, String userPrompt) {
        return handlePrompt(gitUrl, userPrompt, null);
    }

    public String handlePrompt(String gitUrl, String userPrompt, String branch) {
        return agentLoop(gitUrl, userPrompt, branch);
    }

    private String agentLoop(String gitUrl, String userPrompt, String branch) {
        Session session = sessionManager.getSession(gitUrl, branch);
        ClonedRepo repo = repoHandler.getRepo(gitUrl, branch);
        if (repo == null) return "Repository not found.";

        Graph graph;
        try {
            graph = repoHandler.getGraph(repo);
        } catch (Exception e) {
            return "Error loading graph: " + e.getMessage();
        }

		if (!session.isInitialStructureLogged()) {
            session.getMemory().getStructure().addEntry("graph_structure", graph.toString());
            session.setInitialStructureLogged(true);
        }

        int iterations = 0;
        String currentResponse = "";
        List<Tool> agentTools = mcpToolKit.getSummaryTools(); // For now, agent uses summary tools

        while (iterations++ < MAX_ITERATIONS) {
            List<Content> contents = buildContent(session.getMemory(), userPrompt);

            System.out.println("DEBUG: Sending to Gemini");
            System.out.println(formatContents(contents));

            // ✅ new structured response
            SendMessageResult result = model.sendMessageNew(contents, agentTools);
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
                session.getMemory().getEpisodic().addEntry("error:model_finish", currentResponse);
                break;
            }

            if (result.getText().isPresent()) {
                currentResponse = result.getText().get();
            } else {
                System.out.println("Model returned no usable output");
                break ;
            }

            session.getMemory().getEpisodic().addEntry("model", currentResponse);
            break;
        }

        return getFinalResponse(session.getMemory());
    }

    /**
     * Centralized tool call handling. Also stores tool results into relevant memory stores.
     */
    private String handleToolCall(String tool, Object param, ClonedRepo repo, Graph graph, Session session) {
        ToolExecutionContext context = new ToolExecutionContext(repo, graph, session);
        return mcpToolKit.executeTool(tool, param, context);
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
                        "4. KEEP EXPLORING until you have complete knowledge to produce a final, comprehensive documentation.\n" +
                        "5. IMPORTANT: When exploration requires multiple queries, ALWAYS issue MULTIPLE TOOL CALLS in THE SAME response instead of one by one.\n" +
                        "   - Example: If you need info from 3 files, call read_file() on all 3 files in one step.\n" +
                        "   - Example: If you need both dependency info and node details, call both tools in the same step.\n" +
                        "   - Example: If you need to summarise code, call summarise_code on all target nodes in one step.\n" +
                        "6. NEVER delay tool calls — batch them together whenever possible.\n" +
                        "7. Once you have gathered all info, output the README documentation as your final answer.\n";
//                        + "Available tools: " + getAvailableToolsStr() + "\n";

        contents.add(Content.builder()
                .parts(List.of(Part.builder().text(systemInstruction).build()))
                .role("user")
                .build());

        // === Summary Memory ===
        String summary = memory.getSummary().toString(1);
        if (!summary.isBlank()) {
            contents.add(Content.builder()
                    .parts(List.of(Part.builder().text("PROJECT SUMMARY:\n" + summary).build()))
                    .role("user")
                    .build());
        }

        // === Code Summary ===
        String codeSummary = memory.summarizeCode(CODE_SUMMARY_ENTRIES);
        if (!codeSummary.isBlank()) {
            contents.add(Content.builder()
                    .parts(List.of(Part.builder().text("CODE MEMORY:\n" + codeSummary).build()))
                    .role("user")
                    .build());
        }

        // === Structure Memory (recent only) ===
        List<Memory.MemoryEntry> structureEntries = memory.getStructure().getEntries();
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
        List<Memory.MemoryEntry> episodicEntries = memory.getEpisodic().getEntries();
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
        List<Memory.MemoryEntry> episodic = memory.getEpisodic().getEntries();
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

    private String getAvailableToolsStr(List<Tool> tools) {
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
