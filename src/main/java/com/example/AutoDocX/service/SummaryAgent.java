package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.model.repo.Model;
import com.example.AutoDocX.model.repo.SendMessageResult;
import com.example.AutoDocX.model.repo.ToolCallData;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.parser.model.GraphNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SummaryAgent {

    private static final int MAX_ITERATIONS = 5;

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
            @Qualifier("geminiCentral") Model model
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
        ToolExecutionContext toolExecutionContext = new ToolExecutionContext(repo, graph, session);

        if (!session.isInitialStructureLogged()) {
            session.getMemory().getStructure().addEntry("graph_structure", graph.toString());
            mcpToolKit.executeTool("find_central_nodes", Map.of("n", 10), toolExecutionContext);
            session.setInitialStructureLogged(true);
        }

        int iterations = 0;
        while (iterations++ < MAX_ITERATIONS) {
            List<Tool> summaryTools = mcpToolKit.getExplorationTools();
            String loopPrompt = "Explore the codebase breadth-first. Use tools in batches. After finishing tool calls, call update_understanding with a concise plan: current understanding + next actions.";
            List<Content> contents = buildLoopContent(session.getMemory(), loopPrompt);

            System.out.println("DEBUG (SummaryAgent): Sending to Gemini");
            System.out.println(formatContents(contents));

            SendMessageResult result = model.sendMessageNew(contents, summaryTools);
            System.out.println("DEBUG (SummaryAgent): Model Response\n" + result);

            if (!result.getToolCalls().isEmpty()) {
                for (ToolCallData fc : result.getToolCalls()) {
                    mcpToolKit.executeTool(fc.getName(), fc.getArgs(), toolExecutionContext);
                }
                // continue loop to let the model process tool results; understanding update is required by prompt
                continue;
            }

            if (result.getText().isPresent()) {
                session.getMemory().getEpisodic().addEntry("model", result.getText().get());
            }
        }

        // Final summary generation step
        return generateFinalSummary(session);
    }

    private String generateFinalSummary(Session session) {
        String finalPrompt = "Now produce the final project-level summary. Use your recorded understanding and memory. Provide: intro, architecture overview, and complete inventory of nodes (mark summarised vs inferred).";
        List<Content> contents = null;
        try {
            contents = buildFinalSummaryContent(session.getMemory(), finalPrompt, repoHandler.getGraph(session));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        System.out.println("DEBUG (SummaryAgent): Sending to Gemini");
        System.out.println(formatContents(contents));
        SendMessageResult result = model.sendMessageNew(contents, List.of());
        System.out.println("DEBUG (SummaryAgent): Model Response\n" + result);

        if (result.getText().isPresent()) {
            String finalSummary = result.getText().get();
            session.getMemory().getSummary().replaceEntry("project_summary", finalSummary);
            return finalSummary;
        }
        return "No summary generated.";
    }

    private List<Content> buildLoopContent(Memory memory, String userPrompt) {
        List<Content> contents = new ArrayList<>();
        String systemInstruction =
"""
You are an expert software architect. Your task is to explore a codebase and prepare a project-level summary.
Your mission is preparatory: you are building the base understanding for a FULL documentation workflow.

PRINCIPLES
- Be factual: do not invent names or dependencies.
- Breadth first: aim to cover all important components.
- Use `find_neighbour_nodes` freely with deep depth (example 5) to expand coverage.
- Use `get_code` selectively, you don't always need the entire code to infer.

RULES
1. Actively expand the graph to make sure all major modules, layers, and utilities are mapped.
2. IMPORTANT: When exploration requires multiple queries, ALWAYS issue MULTIPLE TOOL CALLS in THE SAME response instead of one by one.
    - Example: If you need info from 3 nodes, call get_code() on all 3 in one step.
    - Example: If you need to make summary, get dependency info and node details call ALL tools in the same step.
3. You MUST always actively use the summarise_code tool to build context (memory disappears gradually):
    - When code memory is available, use `summarise_code`
    - Without code but obvious usage → use `summarise_code` with summary starting with "(inferred)"
4. CRITICAL: You MUST always call update_understanding in each response, capturing:
    - Current understanding of the project (what you know so far)
    - What to do next (concrete next steps and target nodes)

IMPORTANT:
Every single response MUST include a call to update_understanding.
Never produce a response without it.
""";
//                        "You are an expert software architect. Your goal is to analyze a codebase and produce:\n" +
//                        " - A general introduction to the project (its scope and purpose).\n" +
//                        " - An architectural overview of major modules and their interactions.\n" +
//                        " - A comprehensive map of ALL nodes worth documenting later (modules, services, APIs, utilities, etc.).\n" +
//                        "\n" +
//                        "The codebase is serialized into a code graph, showing relationships between nodes.\n" +
//                        "\n" +
//                        "PRINCIPLES:\n" +
//                        " - Be factual: do not invent structure, names, or dependencies.\n" +
//                        " - Prefer breadth over depth: aim to identify ALL important components, not to retrieve every single code content.\n" +
//                        " - Use `find_neighbour_nodes` freely to expand the map, since it is low-cost compared to retrieving code.\n" +
//                        " - `get_code` is expensive and should only be used in half of all nodes. selectively use it on nodes that can possibly change the overview\n" +
//                        " - You may create summaries for nodes as even if their code was not retrieved, but you must start the summary with 'inferred'.\n" +
//                        " - Your mission is preparatory: you are building the *plan* for a documentation workflow. The output should clearly mark all parts worth documenting, not just a minimal subset.\n" +
//                        "\n" +
//                        "RULES:\n" +
//                        "1. You MUST actively explore the graph until you have identified ALL important nodes worth documenting, not just a few central ones.\n" +
//                        "2. If there is code in the code memory, you must use the `summarise_code` tool to summarise it. This ensures memory is compact and knowledge is preserved.\n" +
//                        "3. Use `find_neighbour_nodes` iteratively to expand exploration. Continue expanding until you are confident you have mapped the full project structure (all major modules, layers, services, and utilities).\n" +
//                        "4. IMPORTANT: When exploration requires multiple queries, ALWAYS issue MULTIPLE TOOL CALLS in THE SAME response instead of one by one.\n" +
//                        "   - Example: If you need info from 3 nodes, call get_code() on all 3 in one step.\n" +
//                        "   - Example: If you need both dependency info and node details, call both tools in the same step.\n" +
//                        "   - Example: If you need to summarise code, call summarise_code on all relevant nodes in one step.\n" +
//                        "5. Summarise every important node:\n" +
//                        "   - If code is available, use `summarise_code`.\n" +
//                        "   - If code is not retrieved but the node is clearly important, create a high-level inferred summary (mark it as inferred).\n" +
//                        "6. Stop ONLY when you believe enough information is retrieved to make a full project-level overview AND a complete list of all nodes that should be documented.\n" +
//                        "7. Final output must include:\n" +
//                        "   - A general introduction to the project.\n" +
//                        "   - An architectural overview of modules and their relationships.\n" +
//                        "   - A comprehensive inventory of nodes worth documenting, together with their summary, each marked as `summarised` (code) or `inferred` (context-only).\n";

                contents.add(Content.builder().role("user").parts(Part.builder().text(systemInstruction).build()).build());

                // Structure Memory (recent)
                List<Memory.MemoryEntry> structureEntries = memory.getStructure().getEntries();
                if (!structureEntries.isEmpty()) {
                    StringBuilder structureSection = new StringBuilder("STRUCTURE MEMORY:\n");
                    int start = Math.max(0, structureEntries.size() - 15);
                    for (int i = start; i < structureEntries.size(); i++) {
                        Memory.MemoryEntry e = structureEntries.get(i);
                        structureSection.append("- ").append(e.getQuery()).append(": ").append(e.getResult()).append("\n");
                    }
                    contents.add(Content.builder().parts(Part.builder().text(structureSection.toString()).build()).role("user").build());
                }

                // Code Memory (recent)
                String codeSummary = memory.getCode().toString(20);
                if (!codeSummary.isBlank()) {
                    contents.add(Content.builder().parts(Part.builder().text("CODE MEMORY:\n" + codeSummary).build()).role("user").build());
                }

                // Summary Memory including understanding
                String summary = memory.getSummary().toString();
                if (!summary.isBlank()) {
                    contents.add(Content.builder().parts(Part.builder().text("EXISTING CODE SUMMARY:\n" + summary).build()).role("user").build());
                }

                // User prompt for this loop
                contents.add(Content.builder().role("user").parts(Part.builder().text(userPrompt).build()).build());

                return contents;
            }

            private List<Content> buildFinalSummaryContent(Memory memory, String userPrompt, Graph graph) {
                List<Content> contents = new ArrayList<>();

                String systemInstruction =
        """
You are an expert software architect. Produce the final comprehensive project summary using the accumulated memory and the 'understanding' entry.

Deliver:
- Project introduction
- Architectural overview of modules and relationships
- Complete inventory of nodes to document, each marked summarised (based on code summary) or inferred (context-only)
""";

        contents.add(Content.builder().role("user").parts(Part.builder().text(systemInstruction).build()).build());

        String understanding = Optional.ofNullable(memory.getSummary().getEntry("understanding")).orElse("");
        if (!understanding.isBlank()) {
            contents.add(Content.builder().role("user").parts(Part.builder().text("CURRENT UNDERSTANDING:\n" + understanding).build()).build());
        }

        String summary = memory.getSummary().toString();
        if (!summary.isBlank()) {
            contents.add(Content.builder().role("user").parts(Part.builder().text("EXISTING CODE SUMMARY:\n" + summary).build()).build());
        }

        String codeSummary = memory.getCode().toString(20);
        if (!codeSummary.isBlank()) {
            contents.add(Content.builder().role("user").parts(Part.builder().text("CODE MEMORY:\n" + codeSummary).build()).build());
        }

        String projectStructure = graph.getNodes().stream().filter(node -> node.getType() == GraphNode.NodeType.CLASS).map(node -> node.getId()).collect(Collectors.joining("\n"));
        if (!projectStructure.isBlank()) {
            contents.add(Content.builder().role("user").parts(Part.builder().text("ALL NODES:\n" + projectStructure).build()).build());
        }

        contents.add(Content.builder().role("user").parts(Part.builder().text(userPrompt).build()).build());
        return contents;
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
