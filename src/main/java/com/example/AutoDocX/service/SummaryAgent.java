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
public class SummaryAgent {
    private static final Logger logger = LoggerFactory.getLogger(SummaryAgent.class);

    private static final int DEFAULT_MAX_ITERATIONS = 5;

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
        return runCore(gitUrl, branch, null, null);
    }

    public String run(String gitUrl, String branch, String focusPrompt) {
        return runCore(gitUrl, branch, focusPrompt, null);
    }

    public String run(String gitUrl, String branch, Integer iterations) {
        return runCore(gitUrl, branch, null, iterations);
    }

    public String run(String gitUrl, String branch, String focusPrompt, Integer iterations) {
        return runCore(gitUrl, branch, focusPrompt, iterations);
    }

    private String runCore(String gitUrl, String branch, String focusPrompt, Integer iterationLimit) {
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

        String runId = UUID.randomUUID().toString();
        int iterations = 0;
        int maxIterations = (iterationLimit == null || iterationLimit <= 0) ? DEFAULT_MAX_ITERATIONS : iterationLimit;

        while (iterations++ < maxIterations) {
            List<Tool> summaryTools = mcpToolKit.getExplorationTools();
            String basePrompt = "Explore the codebase to provide useful context that can help answer the user’s query. Expand understanding when needed using available tools.";
            String loopPrompt = (focusPrompt != null && !focusPrompt.isBlank())
                    ? basePrompt + "\nUSER QUERY/FOCUS: " + focusPrompt
                    : basePrompt;

            List<Content> contents = buildLoopContent(session.getMemory(), loopPrompt);

            SendMessageResult result;
            try {
                result = model.sendMessageNew(contents, summaryTools);
            } catch (Exception e) {
                String msg = "Model invocation error: " + e.getMessage();
                logger.warn("SUM[{}] {}", runId, msg);
                session.getMemory().getEpisodic().addEntry("error:model_call", msg);
                break;
            }

            if (!result.getToolCalls().isEmpty()) {
                for (ToolCallData fc : result.getToolCalls()) {
                    logger.info("SUM[{}] Executing tool: {} with args: {}", runId, fc.getName(), fc.getArgs());
                    mcpToolKit.executeTool(fc.getName(), fc.getArgs(), toolExecutionContext);
                }
                continue; // let model process tool results in next loop
            }

            // End early if no tools are called
            if (result.getToolCalls().isEmpty()) {
                if (result.getText().isPresent()) {
                    session.getMemory().getEpisodic().addEntry("model", result.getText().get());
                    return result.getText().get();
                }
                break;
            }
        }

        String finalPrompt = (focusPrompt != null && !focusPrompt.isBlank())
                ? "Provide a final summary and context for the query. USER QUERY/FOCUS: " + focusPrompt
                : "Provide a final summary and context for the user’s query.";

        return generateFinalSummary(session, finalPrompt);
    }

    private String generateFinalSummary(Session session, String finalPrompt) {
        List<Content> contents;
        try {
            contents = buildFinalSummaryContent(session.getMemory(), finalPrompt, repoHandler.getGraph(session));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        SendMessageResult result;
        try {
            result = model.sendMessageNew(contents, List.of());
        } catch (Exception e) {
            String msg = "Final summary generation failed: " + e.getMessage();
            logger.warn("SUM-FINAL {}", msg);
            return msg;
        }

        return result.getText().orElse("No summary generated.");
    }

    private List<Content> buildLoopContent(Memory memory, String userPrompt) {
        List<Content> contents = new ArrayList<>();

        String systemInstruction =
"""
You are an expert software architect.

RULES
- Be factual: do not invent names or dependencies.
- You can Infer, but you MUST mark the information as "inferred"
- Use `find_neighbour_nodes` to expand graph coverage.
- Use `get_code` only when necessary for better context.

Your primary goal: help the user by directly providing what they ask for.
- If the request is explicit (e.g., "show me the source code of X", "list dependencies of Y"):
    - satisfy it directly using available tools, without unnecessary exploration or summary and shortening.
  
- If the request is broad, unclear, or about project understanding (e.g., "summarize", "explain architecture", "give context")
    - explore the codebase, expand the graph, and build summaries as needed.
  
IMPORTANT
- When exploration requires multiple queries, ALWAYS issue MULTIPLE TOOL CALLS in THE SAME response instead of one by one.
    - Example: If you need info from 5 nodes, call get_code() on all 5 nodes in one step.
    - Example: Call find_neighbour_nodes, get_code, and update_understanding all in the same step if you need to.
""";

        contents.add(Content.builder().role("user").parts(Part.builder().text(systemInstruction).build()).build());

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

        String codeSummary = memory.getCode().toString(20);
        if (!codeSummary.isBlank()) {
            contents.add(Content.builder().parts(Part.builder().text("CODE MEMORY:\n" + codeSummary).build()).role("user").build());
        }

        String summary = memory.getSummary().toString();
        if (!summary.isBlank()) {
            contents.add(Content.builder().parts(Part.builder().text("EXISTING CODE SUMMARY:\n" + summary).build()).role("user").build());
        }

        contents.add(Content.builder().role("user").parts(Part.builder().text(userPrompt).build()).build());
        return contents;
    }

    private List<Content> buildFinalSummaryContent(Memory memory, String userPrompt, Graph graph) {
        List<Content> contents = new ArrayList<>();

        String systemInstruction =
"""
You are an expert software architect.
- If the request is explicit (e.g., "show me the source code of X", "list dependencies of Y"):
    - satisfy it directly using available tools, without unnecessary summary and shortening.
- Else produce a summary that
    - gives useful context to the user’s query.
    - contains ALL information that is helpful for the query
""";

        contents.add(Content.builder().role("user").parts(Part.builder().text(systemInstruction).build()).build());

        String understanding = Optional.ofNullable(memory.getSummary().getEntry("understanding")).orElse("");
        if (!understanding.isBlank()) {
            contents.add(Content.builder().role("user").parts(Part.builder().text("CURRENT UNDERSTANDING:\n" + understanding + "\n\n").build()).build());
        }

        String summary = memory.getSummary().toString();
        if (!summary.isBlank()) {
            contents.add(Content.builder().role("user").parts(Part.builder().text("EXISTING CODE SUMMARY:\n" + summary + "\n\n").build()).build());
        }
//
//        String projectStructure = graph.getNodes().stream()
//                .filter(node -> node.getType() == GraphNode.NodeType.CLASS)
//                .map(GraphNode::getId)
//                .collect(Collectors.joining("\n"));
//        if (!projectStructure.isBlank()) {
//            contents.add(Content.builder().role("user").parts(Part.builder().text("ALL NODES:\n" + projectStructure + "\n\n").build()).build());
//        }

        contents.add(Content.builder().role("user").parts(Part.builder().text(userPrompt).build()).build());
        return contents;
    }
}
