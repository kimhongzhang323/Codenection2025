package com.example.AutoDocX.service.agent;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.model.Model;
import com.example.AutoDocX.model.SendMessageResult;
import com.example.AutoDocX.model.ToolCallData;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.service.*;
import com.example.AutoDocX.service.agent.tools.McpToolKit;
import com.example.AutoDocX.service.agent.data.Session;
import com.example.AutoDocX.service.agent.tools.ToolExecutionContext;
import com.example.AutoDocX.service.agent.memory.Memory;
import com.example.AutoDocX.service.agent.memory.MemoryInterface;
import com.example.AutoDocX.service.agent.util.AgentUtil;
import com.example.AutoDocX.service.agent.util.MessageBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.*;

@Service
public class SummaryAgent {
    private static final Logger logger = LoggerFactory.getLogger(SummaryAgent.class);

    private static final int DEFAULT_MAX_ITERATIONS = 5;

    private final RepoHandler repoHandler;
    private final SessionManager sessionManager;
    private final McpToolKit mcpToolKit;
    private final Model model;
    private final DocumentHandlingService documentHandlingService;
    private final ObjectMapper objectMapper;

    @Autowired
    public SummaryAgent(
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
        DocumentationHandler docHandler = documentHandlingService.getDocumentHandler(session);

        Graph graph;
        try {
            graph = repoHandler.getGraph(repo);
        } catch (Exception e) {
            return "Error loading graph: " + e.getMessage();
        }
        ToolExecutionContext toolExecutionContext = new ToolExecutionContext(repo, graph, session, session.getMemory().getSumAgentLog());

    session.getMemory().getSumAgentLog().newRound();
    String initialFocus = (focusPrompt == null || focusPrompt.isBlank()) ? "General summary" : focusPrompt;
    session.getMemory().getSumAgentLog().addEntry("user", initialFocus);

        if (!session.isInitialStructureLogged()) {
            session.getMemory().getStructure().addEntry("graph_structure", graph.toString());
            mcpToolKit.executeTool("find_central_nodes", Map.of("n", 10), toolExecutionContext);
            session.setInitialStructureLogged(true);
        }

        String runId = UUID.randomUUID().toString();
        int iterations = 0;
        int maxIterations = (iterationLimit == null || iterationLimit < 0) ? DEFAULT_MAX_ITERATIONS : iterationLimit;

    while (iterations++ < maxIterations) {
        MessageBuilder messageBuilder = new MessageBuilder();
        messageBuilder.addTools(mcpToolKit.getExplorationTools());

        String basePrompt = "Explore the codebase to provide useful context that can help answer the user’s query. Expand understanding when needed using available tools.";
        String loopPrompt = (focusPrompt != null && !focusPrompt.isBlank())
            ? basePrompt + "\nUSER QUERY/FOCUS: " + focusPrompt
            : basePrompt;

        List<Content> contents = buildLoopContent(session, docHandler, loopPrompt, messageBuilder);

        SendMessageResult result;
        try {
        result = model.sendMessage(contents, messageBuilder.getTools());
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

            // End early if no tools are called
            if (result.getToolCalls().isEmpty()) {
                if (result.getText().isPresent()) {
                    session.getMemory().getSumAgentLog().addEntry("model", result.getText().get());
                    return result.getText().get();
                }
                break;
            }
        }

        String finalPrompt = (focusPrompt != null && !focusPrompt.isBlank())
                ? "Provide a final summary and context for the query. USER QUERY/FOCUS: " + focusPrompt
                : "Provide a final summary and context for the user’s query.";

        String finalSummary = generateFinalSummary(session, finalPrompt, docHandler);
        session.getMemory().getSumAgentLog().addEntry("model", finalSummary);
        return finalSummary;
    }

    private String generateFinalSummary(Session session, String finalPrompt, DocumentationHandler docHandler) {
        List<Content> contents;
        try {
            contents = buildFinalSummaryContent(session.getMemory(), finalPrompt, repoHandler.getGraph(session), docHandler);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        SendMessageResult result;
        try {
            result = model.sendMessage(contents, List.of());
        } catch (Exception e) {
            String msg = "Final summary generation failed: " + e.getMessage();
            logger.warn("SUM-FINAL {}", msg);
            return msg;
        }

        return result.getText().orElse("No summary generated.");
    }

    private List<Content> buildLoopContent(Session session, DocumentationHandler docHandler, String userPrompt, MessageBuilder messageBuilder) {
        Memory memory = session.getMemory();

        String systemInstruction = AgentUtil.loadSystemPrompt("summary_agent_loop_system.txt");
        messageBuilder.addSystem(systemInstruction);

        StringBuilder context = new StringBuilder();

        String docContext = docHandler.toContextString();
        if (!docContext.isBlank()) {
            context.append(docContext).append("\n\n");
        }

        List<MemoryInterface.MemoryEntry> structureEntries = memory.getStructure().getEntries();
        if (!structureEntries.isEmpty()) {
            context.append("STRUCTURE MEMORY:\n");
            int start = Math.max(0, structureEntries.size() - 15);
            for (int i = start; i < structureEntries.size(); i++) {
                MemoryInterface.MemoryEntry e = structureEntries.get(i);
                context.append("- ").append(e.getKey()).append(": ").append(e.getValue()).append("\n");
            }
            context.append("\n");
        }

        String codeSummary = memory.getCode().toString(20);
        if (!codeSummary.isBlank()) {
            context.append("CODE MEMORY:\n").append(codeSummary).append("\n\n");
        }

        String summary = memory.getSummary().toString();
        if (!summary.isBlank()) {
            context.append("EXISTING CODE SUMMARY:\n").append(summary).append("\n\n");
        }

        context.append(userPrompt);
        messageBuilder.addUser(context.toString());
        messageBuilder.addMemory(memory.getSumAgentLog(), DEFAULT_MAX_ITERATIONS * 2 + 2);
        return messageBuilder.build();
    }

    private List<Content> buildFinalSummaryContent(Memory memory, String userPrompt, Graph graph, DocumentationHandler docHandler) {
        List<Content> contents = new ArrayList<>();

        String systemInstruction = AgentUtil.loadSystemPrompt("summary_agent_final_system.txt");

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
