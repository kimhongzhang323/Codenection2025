package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.parser.model.GraphNode;
import com.example.AutoDocX.service.RepoHandler.NodeNotFoundException;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.io.IOException;
import java.util.Collections;

@Service
public class McpToolbox {
    private final RepoHandler repoHandler;

    public McpToolbox(RepoHandler repoHandler) {
        this.repoHandler = repoHandler;
    }

    public String getCode(ClonedRepo repo, String nodeId) throws IOException, NodeNotFoundException {
        return repoHandler.getCodeChunk(repo, nodeId);
    }

    public String findDirectConnections(Graph graph, String nodeId) {
        return graph.bfs(nodeId, 1); // depth 1 for direct connections
    }

    public String folderTreeStructure(ClonedRepo repo, String folderPath) {
        // Placeholder: implement actual folder tree logic if needed
        return "Tree structure for: " + folderPath;
    }

    public List<String> getNodesInFile(Graph graph, String filePath) {
        return graph.getNodes().stream()
            .filter(node -> filePath.equals(node.getFilePath()) && node.getType() == GraphNode.NodeType.CLASS)
            .map(GraphNode::getLabel)
            .collect(Collectors.toList());
    }
}
