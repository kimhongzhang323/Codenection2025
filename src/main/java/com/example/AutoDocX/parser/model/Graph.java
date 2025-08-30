package com.example.AutoDocX.parser.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.ArrayList;
import java.util.Queue;
import java.util.LinkedList;
import java.util.Set;
import java.util.HashSet;
import java.util.Optional;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Graph {
    private List<GraphNode> nodes = new ArrayList<>();
    private List<GraphLink> links = new ArrayList<>();

    public void addNode(GraphNode node) {
        this.nodes.add(node);
    }

    public void addLink(GraphLink link) {
        this.links.add(link);
    }

    public Optional<GraphNode> getNodeById(String query) {
        return nodes.stream().filter(node -> node.getId().equals(query) || node.getLabel().equals(query)).findFirst();
    }

    public String bfs(String startNodeId, int depthLimit) {
        StringBuilder traversalResult = new StringBuilder("BFS Traversal starting from ").append(startNodeId).append(" with depth limit ").append(depthLimit).append(":\n");
        Queue<Map.Entry<GraphNode, Integer>> queue = new LinkedList<>();
        Set<String> visited = new HashSet<>();

        Optional<GraphNode> startNodeOpt = getNodeById(startNodeId);
        if (startNodeOpt.isEmpty()) {
            return traversalResult.append("  Start node not found.").toString();
        }

        GraphNode startNode = startNodeOpt.get();
        queue.add(Map.entry(startNode, 0));
        visited.add(startNode.getId());
        traversalResult.append("  Visited: ").append(startNode.getLabel()).append(" (").append(startNode.getId()).append(") at depth 0\n");

        while (!queue.isEmpty()) {
            Map.Entry<GraphNode, Integer> currentEntry = queue.poll();
            GraphNode currentNode = currentEntry.getKey();
            int currentDepth = currentEntry.getValue();

            if (currentDepth >= depthLimit) {
                continue; // Do not explore further if depth limit is reached
            }

            for (GraphLink link : currentNode.getOutgoingLinks()) {
                String neighborId = link.getTarget();
                if (!visited.contains(neighborId)) {
                    getNodeById(neighborId).ifPresent(neighborNode -> {
                        visited.add(neighborId);
                        queue.add(Map.entry(neighborNode, currentDepth + 1));
                        traversalResult.append("  Visited: ").append(neighborNode.getLabel()).append(" (").append(neighborNode.getId()).append(") at depth ").append(currentDepth + 1).append("\n");
                    });
                }
            }
        }
        return traversalResult.toString();
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("Graph Representation:\n");
        sb.append("========================\n");

        sb.append("Nodes (Total: ").append(nodes.size()).append("):\n");
        nodes.forEach(node -> {
            sb.append("  - ").append(node.getId()).append(" (Type: ").append(node.getType()).append(", Label: ").append(node.getLabel()).append(")\n");
            if (!node.getOutgoingLinks().isEmpty()) {
                sb.append("    Outgoing Links:\n");
                node.getOutgoingLinks().forEach(link -> sb.append("      -> ").append(link.getTarget()).append(" (Type: ").append(link.getType()).append(")\n"));
            }
            if (!node.getIncomingLinks().isEmpty()) {
                sb.append("    Incoming Links:\n");
                node.getIncomingLinks().forEach(link -> sb.append("      <- ").append(link.getSource()).append(" (Type: ").append(link.getType()).append(")\n"));
            }
        });

        sb.append("\nLinks (Total: ").append(links.size()).append("):\n");
        links.forEach(link -> sb.append("  - ").append(link.getSource()).append(" --(").append(link.getType()).append(")--> ").append(link.getTarget()).append("\n"));

        sb.append("========================\n");
        return sb.toString();
    }
}
