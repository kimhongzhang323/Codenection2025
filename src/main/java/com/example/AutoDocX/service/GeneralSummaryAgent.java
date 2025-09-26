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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GeneralSummaryAgent {
    private static final Logger logger = LoggerFactory.getLogger(GeneralSummaryAgent.class);

    private static final int DEFAULT_MAX_ITERATIONS = 5;

    private final RepoHandler repoHandler;
    private final SessionManager sessionManager;
    private final McpToolKit mcpToolKit;
    private final Model model;
    private final DocumentHandlingService documentHandlingService;
    private final ObjectMapper objectMapper;

    @Autowired
    public GeneralSummaryAgent(
            RepoHandler repoHandler,
            SessionManager sessionManager,
            McpToolKit mcpToolKit,
            @Qualifier("geminiCentral") Model model,
            DocumentHandlingService documentHandlingService
    ) {
        this.repoHandler = repoHandler;
        this.sessionManager = sessionManager;
        this.mcpToolKit = mcpToolKit;
        this.model = model;
        this.documentHandlingService = documentHandlingService;
        this.objectMapper = new ObjectMapper();
    }

    public String run(String gitUrl, String branch) {
        return runCore(gitUrl, branch, null, null);
    }

    // Overload: allow callers to provide a focus prompt to steer exploration toward specific parts
    // without ignoring the rest of the project (breadth-first remains required by the prompt).
    public String run(String gitUrl, String branch, String focusPrompt) {
        return runCore(gitUrl, branch, focusPrompt, null);
    }

    // Overload: allow callers to set iteration limit
    public String run(String gitUrl, String branch, Integer iterations) {
        return runCore(gitUrl, branch, null, iterations);
    }

    // Overload: focus + iteration limit
    public String run(String gitUrl, String branch, String focusPrompt, Integer iterations) {
        return runCore(gitUrl, branch, focusPrompt, iterations);
    }

    // DRY core implementation used by both run() overloads; focusPrompt may be null
    private String runCore(String gitUrl, String branch, String focusPrompt, Integer iterationLimit) {
        Session session = sessionManager.getSession(gitUrl, branch);
        ClonedRepo repo = repoHandler.getRepo(gitUrl, branch);
        if (repo == null) return "Repository not found.";
        DocumentationHandler docHandler = documentHandlingService.getDocumentHandler(session);

        Graph graph;
        try {
            graph = repoHandler.getGraph(repo);
        } catch (Exception e) {
            return "Error loading graph: " + e.getMessage();
        }
        ToolExecutionContext toolExecutionContext = new ToolExecutionContext(repo, graph, session, session.getMemory().getSumAgentLog());

        if (!session.isInitialStructureLogged()) {
            session.getMemory().getStructure().addEntry("graph_structure", graph.toString());
            mcpToolKit.executeTool("get_modified_nodes", Map.of(), toolExecutionContext);
            mcpToolKit.executeTool("find_central_nodes", Map.of("n", 10), toolExecutionContext);
            session.setInitialStructureLogged(true);
        }
        String runId = java.util.UUID.randomUUID().toString();
        int iterations = 0;
        int maxIterations = (iterationLimit == null || iterationLimit <= 0) ? DEFAULT_MAX_ITERATIONS : iterationLimit;
        while (iterations++ < maxIterations) {
            List<Tool> summaryTools = mcpToolKit.getExplorationTools();
            String basePrompt = "Explore the codebase to provide a project-level summary. Your primary goal is breadth-first coverage of all important components.";
            String loopPrompt = (focusPrompt != null && !focusPrompt.isBlank())
                ? basePrompt + "\nUSER QUERY/FOCUS: " + focusPrompt
                : basePrompt;

            List<Content> contents = buildLoopContent(session.getMemory(), loopPrompt, docHandler);

            SendMessageResult result;
            try {
                result = model.sendMessage(contents, summaryTools);
            } catch (Exception e) {
                String msg = "Model invocation error: " + e.getMessage();
                logger.warn("SUM[{}] {}", runId, msg);
                session.getMemory().getSumAgentLog().addEntry("error:model_call", msg);
                break;
            }

            if (!result.getToolCalls().isEmpty()) {
                for (ToolCallData fc : result.getToolCalls()) {
                    logger.info("SUM[{}] Executing tool: {} with args: {}", runId, fc.getName(), fc.getArgs());
                    mcpToolKit.executeTool(fc.getName(), fc.getArgs(), toolExecutionContext);
                }
                continue; // let model process tool results in next loop
            }

            if (result.getText().isPresent()) {
                session.getMemory().getSumAgentLog().addEntry("model", result.getText().get());
                return result.getText().get();
            }
            break;
        }

        // Final summary generation step
        String defaultFinalPrompt = "Now produce the final project-level summary. Use your recorded understanding and memory. Provide: intro, architecture overview, and complete inventory of nodes (mark summarised vs inferred).";
        String finalPrompt = (focusPrompt != null && !focusPrompt.isBlank())
            ? defaultFinalPrompt + "\nFOCUS: " + focusPrompt
            : defaultFinalPrompt;

        String finalSummary = generateFinalSummary(session, finalPrompt, docHandler);
        session.getMemory().getSummary().replaceEntry("general_summary", finalSummary);
        return finalSummary;
    }

    private String generateFinalSummary(Session session, String finalPrompt, DocumentationHandler docHandler) {
        List<Content> contents = null;
        try {
            contents = buildFinalSummaryContent(session.getMemory(), finalPrompt, repoHandler.getGraph(session), docHandler);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    // Final request logging centralized in GeminiModel
        SendMessageResult result;
        try {
            result = model.sendMessage(contents, List.of());
        } catch (Exception e) {
            String msg = "Final summary generation failed: " + e.getMessage();
            logger.warn("SUM-FINAL {}", msg);
            return msg;
        }
    // Final response summary logged centrally in GeminiModel

        if (result.getText().isPresent()) {
            return result.getText().get();
        }
        return "No summary generated.";
    }

    private List<Content> buildLoopContent(Memory memory, String userPrompt, DocumentationHandler docHandler) {
        List<Content> contents = new ArrayList<>();
        String systemInstruction =
"""
You are an expert software architect. Your task is to explore a codebase and prepare a project-level summary.
Your mission is preparatory: you are building the base understanding for a FULL documentation workflow.

PRINCIPLES
- Be factual: do not invent names or dependencies.
- Breadth first: aim to cover all important components.
- Use `find_neighbour_nodes` freely with deep depth (example 5) to expand coverage.

RULES
1. Actively expand the graph to make sure all major modules, layers, and utilities are mapped.
2. IMPORTANT: When exploration requires multiple queries, ALWAYS issue MULTIPLE TOOL CALLS in THE SAME response instead of one by one.
    - Example: If you need info from 15 nodes, call get_code() on all 15 nodes in one step.
    - Example: Call find_neighbour_nodes, get_code, and update_understanding all in the same step if you need to.
    - Example: you should call 20+ tools in the same turn for maximum exploration speed
3. CRITICAL: You MUST always call update_understanding in each response, capturing:
    - Current understanding of the project (what you know so far, including previous understandings)
    - A summary section of comprehensive summary of each seen nodes including their purpose, architecture, and dependencies (you should update old understandings if there are new findings)
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

                String docContext = docHandler.toContextString();
                if (!docContext.isBlank()) {
                    contents.add(Content.builder().parts(Part.builder().text(docContext).build()).role("user").build());
                }

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
                String codeSummary = memory.getCode().toString(10);
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

            private List<Content> buildFinalSummaryContent(Memory memory, String userPrompt, Graph graph, DocumentationHandler docHandler) {
                List<Content> contents = new ArrayList<>();

                String systemInstruction =
        """
You are an expert software architect. Produce the final comprehensive project summary using the accumulated memory and the 'understanding' entry.

Deliver:
- Project introduction
- Architectural overview of modules and relationships
- Complete inventory of nodes to document, each marked summarised (based on code summary) or inferred (context-only). Format node_id: (inferred/summarised) {summary}
    * if a node has been modified, mark it as [modified] after its summary
""";

        contents.add(Content.builder().role("user").parts(Part.builder().text(systemInstruction).build()).build());

        String docContext = docHandler.toContextString();
        if (!docContext.isBlank()) {
            contents.add(Content.builder().parts(Part.builder().text(docContext).build()).role("user").build());
        }

        String understanding = Optional.ofNullable(memory.getSummary().getEntry("understanding")).orElse("");
        if (!understanding.isBlank()) {
            contents.add(Content.builder().role("user").parts(Part.builder().text("CURRENT UNDERSTANDING:\n" + understanding + "\n\n").build()).build());
        }

        String summary = memory.getSummary().toString();
        if (!summary.isBlank()) {
            contents.add(Content.builder().role("user").parts(Part.builder().text("EXISTING CODE SUMMARY:\n" + summary + "\n\n").build()).build());
        }

//        String codeSummary = memory.getCode().toString(20);
//        if (!codeSummary.isBlank()) {
//            contents.add(Content.builder().role("user").parts(Part.builder().text("CODE MEMORY:\n" + codeSummary + "\n\n").build()).build());
//        }

        String projectStructure = graph.getNodes().stream().filter(node -> node.getType() == GraphNode.NodeType.CLASS).map(node -> node.getId()).collect(Collectors.joining("\n"));
        if (!projectStructure.isBlank()) {
            contents.add(Content.builder().role("user").parts(Part.builder().text("ALL NODES:\n" + projectStructure + "\n\n").build()).build());
        }

        contents.add(Content.builder().role("user").parts(Part.builder().text(userPrompt).build()).build());
        return contents;
    }
}
