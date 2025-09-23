package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.model.repo.Model;
import com.example.AutoDocX.model.repo.SendMessageResult;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.service.dto.DocParams;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class DocumentationAgent {

    private final RepoHandler repoHandler;
    private final SessionManager sessionManager;
    private final McpToolKit mcpToolKit;
    private final Model model;
    private final SummaryAgent summaryAgent;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final int DEFAULT_MAX_ITERATIONS = 5;

    @Autowired
    public DocumentationAgent(
            RepoHandler repoHandler,
            SessionManager sessionManager,
            McpToolKit mcpToolKit,
            @Qualifier("geminiCentral") Model model,
            SummaryAgent summaryAgent
    ) {
        this.repoHandler = repoHandler;
        this.sessionManager = sessionManager;
        this.mcpToolKit = mcpToolKit;
        this.model = model;
        this.summaryAgent = summaryAgent;
    }

    public String run(String gitUrl, String branch, String userPrompt, DocParams params) {
        return run(gitUrl, branch, userPrompt, params, null);
    }

    // Overload with iteration limit
    public String run(String gitUrl, String branch, String userPrompt, DocParams params, Integer iterationLimit) {
        Session session = sessionManager.getSession(gitUrl, branch);
        ClonedRepo repo = repoHandler.getRepo(gitUrl, branch);
        if (repo == null) return "Repository unavailable.";
        Graph graph;
        try { graph = repoHandler.getGraph(repo); } catch (Exception e) { return "Graph load failed: " + e.getMessage(); }

        ToolExecutionContext ctx = new ToolExecutionContext(repo, graph, session);

        int iterations = 0;
        int maxIterations = (iterationLimit == null || iterationLimit <= 0) ? DEFAULT_MAX_ITERATIONS : iterationLimit;
        while (iterations++ < maxIterations) {
            List<Tool> tools = mcpToolKit.getDocumentationAgentTools();
            List<Content> contents = buildLoopContent(session.getMemory(), userPrompt, params);

            SendMessageResult result = model.sendMessageNew(contents, tools);

            if (!result.getToolCalls().isEmpty()) {
                for (var call : result.getToolCalls()) {
                    String name = call.getName();
                    Map<String, Object> args = call.getArgs();
                    switch (name) {
                        case "get_summary": {
                            String query = String.valueOf(args.getOrDefault("query", ""));
                            Integer summaryIterations = args.get("iterations") instanceof Number ? ((Number) args.get("iterations")).intValue() : null;
                            String sum = (summaryIterations == null)
                                    ? summaryAgent.run(session.getGitUrl(), session.getBranch(), query)
                                    : summaryAgent.run(session.getGitUrl(), session.getBranch(), query, summaryIterations);
                            session.getMemory().getSummary().replaceEntry("project_summary", sum);
                            break;
                        }
                        case "execute_plan": {
                            // should use geminicentral.sendMessageBulk
                        }
                        default: {
                            mcpToolKit.executeTool(name, args, ctx);
                        }
                    }
                }
                // Early return if final doc already produced
                String finalDoc = session.getMemory().getSummary().getEntry("final_documentation");
                if (finalDoc != null && !finalDoc.isBlank()) return finalDoc;
                continue;
            }

            // Early exit on assistant text (Q&A or guidance), and persist to documentation
            if (result.getText().isPresent()) {
                String assistant = result.getText().get();
                session.getMemory().getEpisodic().addEntry("doc_agent.assistant", assistant);
                // Also persist to summary documentation for UI/consumers
                mcpToolKit.executeTool("update_documentation", Map.of("content", assistant), ctx);
                // If user just asked a question, return the text directly
                return assistant;
            }
        }

        // After loop: if we have a final doc, return; else try to execute plan once
        String finalDoc = session.getMemory().getSummary().getEntry("final_documentation");
        if (finalDoc == null || finalDoc.isBlank()) {
            finalDoc = mcpToolKit.executeTool("execute_plan", Map.of(), ctx);
        }
        return finalDoc;
    }

    // Deprecated helpers retained for potential future use
    @Deprecated
    private void planOneShot(Session session, ClonedRepo repo, Graph graph, String userPrompt, DocParams params) { }

    @Deprecated
    private List<Content> buildSectionContents(Session session, ClonedRepo repo, Graph graph, String userPrompt, DocParams params,
                                               String sectionName, String focus, List<String> nodes) { return List.of(); }

    @Deprecated
    private String combineSections(String userPrompt, DocParams params, Map<String, String> sectionOutputs) { return ""; }

    private String safeParams(DocParams p) {
        if (p == null) return "{}";
        try { return objectMapper.writeValueAsString(p); } catch (Exception e) { return "{}"; }
    }

    private List<Content> buildLoopContent(Memory memory, String userPrompt, DocParams params) {
        List<Content> contents = new ArrayList<>();
        String systemInstruction = """
You are a documentation agent. Your task is to produce excellent project documentation or answer the user's request using tools.

RULES
1. Use multiple tool calls in the same response when needed.
2. Keep responses factual and concise.
3. ALWAYS use the provided tools to gather information or perform actions; do not make up information.
4. Use get_summary(query) to get summaries from the summary agent.
""";

        contents.add(Content.builder().role("system").parts(List.of(Part.fromText(systemInstruction))).build());

        StringBuilder context = new StringBuilder();
        context.append("USER_PROMPT:\n").append(userPrompt == null ? "" : userPrompt).append("\n\n");
        context.append("DOC_PARAMS:\n").append(safeParams(params)).append("\n\n");
        String projSummary = Optional.ofNullable(memory.getSummary().getEntry("project_summary")).orElse("");
        if (!projSummary.isBlank()) context.append("PROJECT_SUMMARY:\n").append(projSummary).append("\n\n");
        String plan = memory.getPlan().getEntry("plan");
        if (plan != null && !plan.isBlank()) context.append("CURRENT_PLAN:\n").append(plan).append("\n\n");
        String draft = memory.getSummary().getEntry("documentation");
        if (draft != null && !draft.isBlank()) context.append("CURRENT_DRAFT:\n").append(draft).append("\n\n");

        contents.add(Content.builder().role("user").parts(List.of(Part.fromText(context.toString()))).build());
        return contents;
    }
}
