package com.example.AutoDocX.controller;

import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.parser.model.GraphNode;
import com.example.AutoDocX.service.JavaGraphConverter;
import com.example.AutoDocX.service.JavaTreeConverter;
import com.example.AutoDocX.parser.model.GraphAlgo;
import com.example.AutoDocX.service.McpToolbox;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("api/graph")
public class TestController {

    @Autowired
    private JavaTreeConverter javaTreeConverter;

    @Autowired
    private JavaGraphConverter javaGraphConverter;

    @Autowired
    private McpToolbox mcpToolbox;

    /**
     * Build a graph of THIS project (src/main/java)
     */

    private Graph buildGraphInternal() throws IOException {
        Path repoPath = Path.of("src/main/java");
        var javaClasses = javaTreeConverter.convertRepoToJavaTree(repoPath);
        return javaGraphConverter.convertJavaTreeToGraph(javaClasses);
    }

    @GetMapping("/build")
    public String buildGraph() throws IOException {
        return buildGraphInternal().toString();
    }

    /**
     * Show top-N central class nodes by outgoing calls
     */
    @GetMapping("/central-classes")
    public String getCentralClasses(@RequestParam(defaultValue = "5") int n) throws IOException {
        Graph graph = buildGraphInternal();
        return mcpToolbox.findCentralNodes(graph, n);
    }

    @GetMapping("/neighbours")
    public String getNeighbours(
            @RequestParam String startNodeId,
            @RequestParam(defaultValue = "2") int depth
    ) throws IOException {
        Graph graph = buildGraphInternal();
        return mcpToolbox.getNeighbourSubgraph(graph, startNodeId, depth);
    }

    /**
     * Get a single node by its ID
     */
    @GetMapping("/node/{nodeId}")
    public GraphNode getNodeById(@PathVariable String nodeId) throws IOException {
        Path repoPath = Path.of("src/main/java");
        var javaClasses = javaTreeConverter.convertRepoToJavaTree(repoPath);
        Graph graph = javaGraphConverter.convertJavaTreeToGraph(javaClasses);

        return graph.getNode(nodeId).orElse(null);
    }
}