package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.model.repo.Model;
import com.example.AutoDocX.model.repo.ModelFinishReason;
import com.example.AutoDocX.model.repo.SendMessageResult;
import com.example.AutoDocX.model.repo.ToolCallData;
import com.example.AutoDocX.parser.model.Graph;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;


@Service
public class SummaryAgent {

    private static final int MAX_ITERATIONS = 10;

    private final RepoHandler repoHandler;
    private final SessionManager sessionManager;
    private final McpToolKit mcpToolKit;
    private final Model model;
    private final ObjectMapper objectMapper;

    @Autowired
    public SummaryAgent(
            RepoHandler repoHandler,
            SessionManager sessionManager,
            McpToolKit mcpToolKit,
            @Qualifier("geminiModel") Model model
    ) {
        this.repoHandler = repoHandler;
        this.sessionManager = sessionManager;
        this.mcpToolKit = mcpToolKit;
        this.model = model;
        this.objectMapper = new ObjectMapper();
    }

    public String run(String gitUrl, String branch) {
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
        String finalSummary = "No summary generated.";
        List<Tool> summaryTools = mcpToolKit.getSummaryTools();
        String userPrompt = "Explore the codebase, identify the most important components, and create a compact summary of the project's architecture";

        while (iterations++ < MAX_ITERATIONS) {
            List<Content> contents = buildContent(session.getMemory(), userPrompt);

            System.out.println("DEBUG (SummaryAgent): Sending to Gemini");
            System.out.println(formatContents(contents)); // Optional: for deep debugging

            SendMessageResult result = model.sendMessageNew(contents, summaryTools);
            System.out.println("DEBUG (SummaryAgent): Model Response\n" + result);

            if (!result.getToolCalls().isEmpty()) {
                ToolExecutionContext context = new ToolExecutionContext(repo, graph, session);
                for (ToolCallData fc : result.getToolCalls()) {
                    mcpToolKit.executeTool(fc.getName(), fc.getArgs(), context);
                }
                continue; // Loop again to let the model process tool results
            }

            if (result.getText().isPresent()) {
                finalSummary = result.getText().get();
                session.getMemory().getSummary().replaceEntry("project_summary", finalSummary);
                break; // Summary is complete
            }

            if (result.getModelFinishReason() != ModelFinishReason.OUTPUT_ERROR) {
                finalSummary = "Summary generation stopped unexpectedly. Reason: " + result.getModelFinishReason();
                break;
            }
        }

        return finalSummary;
    }

    private List<Content> buildContent(Memory memory, String userPrompt) {
        List<Content> contents = new ArrayList<>();
        String systemInstruction =
                        "You are an expert software architect. Your goal is to analyze a codebase and produce:\n" +
                        " - A general introduction to the project (its scope and purpose).\n" +
                        " - An architectural overview of major modules and their interactions.\n" +
                        " - A comprehensive map of ALL nodes worth documenting later (modules, services, APIs, utilities, etc.).\n" +
                        "\n" +
                        "The codebase is serialized into a code graph, showing relationships between nodes.\n" +
                        "\n" +
                        "PRINCIPLES:\n" +
                        " - Be factual: verify all claims from the provided tools; do not invent structure, names, or dependencies.\n" +
                        " - Prefer breadth over depth: aim to identify ALL important components, not to retrieve every single file.\n" +
                        " - Use `find_neighbour_nodes` freely to expand the map, since it is low-cost compared to retrieving code.\n" +
                        " - You may create high-level summaries for nodes even if their code was not retrieved, but ONLY when their importance is very likely (e.g., central position, strong connections, or descriptive name).\n" +
                        " - Your mission is preparatory: you are building the *plan* for a documentation workflow. The output should clearly mark all parts worth documenting, not just a minimal subset.\n" +
                        "\n" +
                        "RULES:\n" +
                        "1. You MUST actively explore the graph until you have identified ALL important nodes worth documenting, not just a few central ones.\n" +
                        "2. If there is code in the code memory, you must use the `summarise_code` tool to summarise it. This ensures memory is compact and knowledge is preserved.\n" +
                        "3. Use `find_neighbour_nodes` iteratively to expand exploration. Continue expanding until you are confident you have mapped the full project structure (all major modules, layers, services, and utilities).\n" +
                        "4. IMPORTANT: When exploration requires multiple queries, ALWAYS issue MULTIPLE TOOL CALLS in THE SAME response instead of one by one.\n" +
                        "   - Example: If you need info from 3 nodes, call get_code() on all 3 in one step.\n" +
                        "   - Example: If you need both dependency info and node details, call both tools in the same step.\n" +
                        "   - Example: If you need to summarise code, call summarise_code on all relevant nodes in one step.\n" +
                        "5. Summarise every important node:\n" +
                        "   - If code is available, use `summarise_code`.\n" +
                        "   - If code is not retrieved but the node is clearly important, create a high-level inferred summary (mark it as inferred).\n" +
                        "6. Do not stop early. Stop ONLY when you have produced a full project-level overview AND a complete list of all nodes that should be documented.\n" +
                        "7. Final output must include:\n" +
                        "   - A general introduction to the project.\n" +
                        "   - An architectural overview of modules and their relationships.\n" +
                        "   - A comprehensive inventory of nodes worth documenting, each marked as `summarised` (code) or `inferred` (context-only).\n";


        contents.add(Content.builder().role("user").parts(Part.builder().text(systemInstruction).build()).build());

//        String memoryStr = "";

        // === Structure Memory (recent only) ===
        List<Memory.MemoryEntry> structureEntries = memory.getStructure().getEntries();
        if (!structureEntries.isEmpty()) {
            StringBuilder structureSection = new StringBuilder("STRUCTURE MEMORY:\n");
            int start = Math.max(0, structureEntries.size() - 15);
            for (int i = start; i < structureEntries.size(); i++) {
                Memory.MemoryEntry e = structureEntries.get(i);
                structureSection.append("- ").append(e.getQuery()).append(": ").append(e.getResult()).append("\n");
            }
            contents.add(Content.builder()
                    .parts(List.of(Part.builder().text(structureSection.toString()).build()))
                    .role("user")
                    .build());
        }

        // === Code Summary ===
        String codeSummary = memory.summarizeCode(15);
        if (!codeSummary.isBlank()) {
            contents.add(Content.builder().role("user").parts(Part.builder().text("CODE MEMORY:\n" + codeSummary).build()).build());
        }

        // === Summary Memory ===
        String summary = memory.getSummary().toString();
        if (!summary.isBlank()) {
            contents.add(Content.builder()
                    .parts(List.of(Part.builder().text("EXISTING CODE SUMMARY:\n" + summary).build()))
                    .role("user")
                    .build());
        }

        // Add the current prompt
        contents.add(Content.builder().role("user").parts(Part.builder().text(userPrompt).build()).build());

        return contents;
    }

    @SuppressWarnings("unchecked")
    private String extractNameFromParams(Object param) {
        if (param == null) return "null";
        Object unwrapped = (param instanceof Optional) ? ((Optional<?>) param).orElse(null) : param;
        if (unwrapped instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) unwrapped;
            if (map.containsKey("node_id")) return String.valueOf(map.get("node_id"));
            if (map.containsKey("n")) return "n=" + String.valueOf(map.get("n"));
            if (map.containsKey("code")) return "code_snippet";
        }
        return String.valueOf(unwrapped);
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
}
