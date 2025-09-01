package com.example.AutoDocX.parser.model;

import com.example.AutoDocX.parser.model.GraphLink;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Queue;
import java.util.LinkedList;
import java.util.HashSet;
import java.util.Optional;
import java.util.Stack;
import java.util.ArrayList;

public class GraphAlgo {

    public static int calculateNodeOutgoingLinkCount(Graph graph, String nodeId) {
        return graph.getNodeById(nodeId)
                .map(node -> (int) node.getOutgoingLinks().stream()
                        .filter(link -> link.getType() == GraphLink.LinkType.COMPOSES || link.getType() == GraphLink.LinkType.CALLS)
                        .count())
                .orElse(0);
    }

    public static List<GraphNode> findCentralNodes(Graph graph, int n) {
        return graph.getNodes().stream()
                .collect(Collectors.toMap(
                        node -> node,
                        node -> calculateNodeOutgoingLinkCount(graph, node.getId())
                ))
                .entrySet().stream()
                .sorted(Map.Entry.comparingByValue(Comparator.reverseOrder()))
                .limit(n)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    public static String bfs(Graph graph, String startNodeId, int depthLimit) {
        StringBuilder traversalResult = new StringBuilder("BFS Traversal starting from ").append(startNodeId).append(" with depth limit ").append(depthLimit).append(":\n");
        Queue<Map.Entry<GraphNode, Integer>> queue = new LinkedList<>();
        Set<String> visited = new HashSet<>();

        Optional<GraphNode> startNodeOpt = graph.getNodeById(startNodeId);
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
                    graph.getNodeById(neighborId).ifPresent(neighborNode -> {
                        visited.add(neighborId);
                        queue.add(Map.entry(neighborNode, currentDepth + 1));
                        traversalResult.append("  Visited: ").append(neighborNode.getLabel()).append(" (").append(neighborNode.getId()).append(") at depth ").append(currentDepth + 1).append("\n");
                    });
                }
            }
        }
        return traversalResult.toString();
    }

    public static String smartDfs(Graph graph, String startNodeId, int depthLimit, double minPopularityRatio) {
        StringBuilder traversalResult = new StringBuilder("Smart DFS Traversal starting from ").append(startNodeId).append(" with depth limit ").append(depthLimit).append(" and popularity ratio ").append(minPopularityRatio).append(":\n");
        Stack<Map.Entry<GraphNode, Integer>> stack = new Stack<>();
        Set<String> visited = new HashSet<>();

        Optional<GraphNode> startNodeOpt = graph.getNodeById(startNodeId);
        if (startNodeOpt.isEmpty()) {
            return traversalResult.append("  Start node not found.").toString();
        }

        GraphNode startNode = startNodeOpt.get();
        stack.push(Map.entry(startNode, 0));
        visited.add(startNode.getId());
        traversalResult.append("  Visited: ").append(startNode.getLabel()).append(" (").append(startNode.getId()).append(") at depth 0\n");

        while (!stack.isEmpty()) {
            Map.Entry<GraphNode, Integer> currentEntry = stack.pop();
            GraphNode currentNode = currentEntry.getKey();
            int currentDepth = currentEntry.getValue();
            int currentNodePopularity = calculateNodeOutgoingLinkCount(graph, currentNode.getId());

            if (currentDepth >= depthLimit) {
                continue;
            }

            // Reverse to push in correct order for DFS (last pushed, first processed)
            List<GraphLink> reversedOutgoingLinks = new ArrayList<>(currentNode.getOutgoingLinks());
            java.util.Collections.reverse(reversedOutgoingLinks);

            for (GraphLink link : reversedOutgoingLinks) {
                String neighborId = link.getTarget();
                Optional<GraphNode> neighborNodeOpt = graph.getNodeById(neighborId);

                if (neighborNodeOpt.isPresent()) {
                    GraphNode neighborNode = neighborNodeOpt.get();
                    int neighborNodePopularity = calculateNodeOutgoingLinkCount(graph, neighborNode.getId());

                    // Pruning logic
                    if (neighborNodePopularity >= (currentNodePopularity * minPopularityRatio)) {
                        if (!visited.contains(neighborId)) {
                            visited.add(neighborId);
                            stack.push(Map.entry(neighborNode, currentDepth + 1));
                            traversalResult.append("  Visited: ").append(neighborNode.getLabel()).append(" (").append(neighborNode.getId()).append(") at depth ").append(currentDepth + 1).append("\n");
                        } else {
                            traversalResult.append("  Skipped (already visited): ").append(neighborNode.getLabel()).append(" (").append(neighborNode.getId()).append(")\n");
                        }
                    } else {
                        traversalResult.append("  Pruned (low popularity): ").append(neighborNode.getLabel()).append(" (").append(neighborNode.getId()).append(") - Neighbor Pop: ").append(neighborNodePopularity).append(", Current Pop * 0.5: ").append(currentNodePopularity * minPopularityRatio).append("\n");
                    }
                } else {
                    traversalResult.append("  Neighbor node not found for link target: ").append(neighborId).append("\n");
                }
            }
        }
        return traversalResult.toString();
    }
}
