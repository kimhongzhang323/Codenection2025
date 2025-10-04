package com.example.AutoDocX.service.agent;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.model.Model;
import com.example.AutoDocX.model.SendMessageResult;
import com.example.AutoDocX.model.ToolCallData;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.parser.model.GraphNode;
import com.example.AutoDocX.service.DocumentHandlingService;
import com.example.AutoDocX.service.DocumentationHandler;
import com.example.AutoDocX.service.RepoHandler;
import com.example.AutoDocX.service.SessionManager;
import com.example.AutoDocX.service.agent.data.Session;
import com.example.AutoDocX.service.agent.memory.Memory;
import com.example.AutoDocX.service.agent.memory.MemoryInterface;
import com.example.AutoDocX.service.agent.tools.McpToolKit;
import com.example.AutoDocX.service.agent.tools.ToolExecutionContext;
import com.example.AutoDocX.service.agent.util.AgentUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
    public GeneralSummaryAgent(RepoHandler repoHandler, SessionManager sessionManager, McpToolKit mcpToolKit, @Qualifier("geminiCentral") Model model, DocumentHandlingService documentHandlingService) {
        this.repoHandler = repoHandler;
        this.sessionManager = sessionManager;
        this.mcpToolKit = mcpToolKit;
        this.model = model;
        this.documentHandlingService = documentHandlingService;
        this.objectMapper = new ObjectMapper();
    }

    public String run(String gitUrl, String branch) throws Exception {
        return runCore(gitUrl, branch, null, null);
    }

    // Overload: allow callers to provide a focus prompt to steer exploration toward specific parts
    // without ignoring the rest of the project (breadth-first remains required by the prompt).
    public String run(String gitUrl, String branch, String focusPrompt) throws Exception {
        return runCore(gitUrl, branch, focusPrompt, null);
    }

    // Overload: allow callers to set iteration limit
    public String run(String gitUrl, String branch, Integer iterations) throws Exception {
        return runCore(gitUrl, branch, null, iterations);
    }

    // Overload: focus + iteration limit
    public String run(String gitUrl, String branch, String focusPrompt, Integer iterations) throws Exception {
        return runCore(gitUrl, branch, focusPrompt, iterations);
    }

    // DRY core implementation used by both run() overloads; focusPrompt may be null
    private String runCore(String gitUrl, String branch, String focusPrompt, Integer iterationLimit) throws Exception {
        Session session = sessionManager.getSession(gitUrl, branch);
        if (!session.getIsGeneralSummaryRunning().compareAndSet(false, true)) {
            throw new Exception("GeneralSummaryAgent is already running, please wait");
        }

        try {
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
                String loopPrompt = (focusPrompt != null && !focusPrompt.isBlank()) ? basePrompt + "\nUSER QUERY/FOCUS: " + focusPrompt : basePrompt;

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
            String finalPrompt = (focusPrompt != null && !focusPrompt.isBlank()) ? defaultFinalPrompt + "\nFOCUS: " + focusPrompt : defaultFinalPrompt;

            String finalSummary = generateFinalSummary(session, finalPrompt, docHandler);
            session.getMemory().getSummary().replaceEntry("general_summary", finalSummary);
            return finalSummary;
        } finally {
            session.getIsGeneralSummaryRunning().set(false);
        }
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
        String systemInstruction = AgentUtil.loadSystemPrompt("general_summary_agent_loop_system.txt");

        contents.add(Content.builder().role("user").parts(Part.builder().text(systemInstruction).build()).build());

        String docContext = docHandler.toContextString();
        if (!docContext.isBlank()) {
            contents.add(Content.builder().parts(Part.builder().text(docContext).build()).role("user").build());
        }

        // Structure Memory (recent)
        List<MemoryInterface.MemoryEntry> structureEntries = memory.getStructure().getEntries();
        if (!structureEntries.isEmpty()) {
            StringBuilder structureSection = new StringBuilder("STRUCTURE MEMORY:\n");
            int start = Math.max(0, structureEntries.size() - 15);
            for (int i = start; i < structureEntries.size(); i++) {
                MemoryInterface.MemoryEntry e = structureEntries.get(i);
                structureSection.append("- ").append(e.getKey()).append(": ").append(e.getValue()).append("\n");
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

        String systemInstruction = AgentUtil.loadSystemPrompt("general_summary_agent_final_system.txt");

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
