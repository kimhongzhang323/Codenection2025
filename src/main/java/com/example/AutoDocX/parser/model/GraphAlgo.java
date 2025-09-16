package com.example.AutoDocX.parser.model;

import java.util.*;
import java.util.stream.Collectors;

public class GraphAlgo {

    public static List<GraphNode> findCentralClassNodes(Graph graph, int n) {
        return graph.getNodes().stream()
                .filter(node -> node.getType() == GraphNode.NodeType.CLASS)
                .sorted((a, b) -> {
                    int degreeA = graph.getOutgoingLinks(a.getId()).size();
                    int degreeB = graph.getOutgoingLinks(b.getId()).size();
                    return Integer.compare(degreeB, degreeA); // descending
                })
                .limit(n)
                .collect(Collectors.toList());
    }

    public static List<GraphLink> getAllLinksForClass(Graph graph, GraphNode classNode) {
        String classId = classNode.getId();

        // Any link from/to this class itself
        List<GraphLink> classLinks = graph.getLinks().stream()
                .filter(link -> link.getSourceID().equals(classId) || link.getTargetID().equals(classId))
                .toList();

        // Any link from/to a method node belonging to this class
        List<GraphLink> methodLinks = graph.getLinks().stream()
                .filter(link -> link.getSourceID().startsWith("method_" + classNode.getLabel()) ||
                        link.getTargetID().startsWith("method_" + classNode.getLabel()))
                .toList();

        List<GraphLink> all = new ArrayList<>();
        all.addAll(classLinks);
        all.addAll(methodLinks);
        return all;
    }

    public static List<GraphNode> findCentralNodesByPageRank(Graph graph, int n) {
        Map<String, Double> pageRankScores = calculatePageRank(graph, 0.85, 20);

        return graph.getNodes().stream()
                .filter(node -> node.getType() == GraphNode.NodeType.CLASS)
                .sorted((a, b) -> {
                    double scoreA = pageRankScores.getOrDefault(a.getId(), 0.0);
                    double scoreB = pageRankScores.getOrDefault(b.getId(), 0.0);
                    return Double.compare(scoreB, scoreA); // descending
                })
                .limit(n)
                .collect(Collectors.toList());
    }

    private static Map<String, Double> calculatePageRank(Graph graph, double dampingFactor, int iterations) {
        Map<String, Double> pageRankScores = new HashMap<>();
        List<GraphNode> nodes = graph.getNodes();
        int numNodes = nodes.size();
        if (numNodes == 0) return pageRankScores;

        // Initialize scores
        for (GraphNode node : nodes) {
            pageRankScores.put(node.getId(), 1.0 / numNodes);
        }

        List<String> utilityPackages = Arrays.asList("/util/", "/utils/", "/helper/", "/helpers/", "/config/", "/common/");

        for (int i = 0; i < iterations; i++) {
            Map<String, Double> newPageRankScores = new HashMap<>();
            double danglingSum = 0.0;

            // Distribute rank from dangling nodes (nodes with no outgoing links)
            for (GraphNode node : nodes) {
                if (graph.getOutgoingLinks(node.getId()).isEmpty()) {
                    danglingSum += pageRankScores.get(node.getId());
                }
            }

            // Calculate new ranks for each node
            for (GraphNode node : nodes) {
                double newRank = (1.0 - dampingFactor) / numNodes; // Base probability
                double incomingRankSum = 0;

                for (GraphLink incomingLink : graph.getIncomingLinks(node.getId())) {
                    GraphNode sourceNode = graph.getNode(incomingLink.getSourceID()).orElse(null);
                    if (sourceNode != null) {
                        int outgoingLinksCount = graph.getOutgoingLinks(sourceNode.getId()).size();
                        if (outgoingLinksCount > 0) {
                            double sourceRank = pageRankScores.get(sourceNode.getId());
                            double packageWeight = 1.0;

                            // Apply penalty for utility packages
                            String sourcePath = sourceNode.getFilePath().replace('\\', '/');
                            if (utilityPackages.stream().anyMatch(sourcePath::contains)) {
                                packageWeight = 0.2; // Penalize utility code
                            }

                            incomingRankSum += (sourceRank / outgoingLinksCount) * packageWeight;
                        }
                    }
                }
                
                // Add rank from dangling nodes
                incomingRankSum += danglingSum / numNodes;

                newPageRankScores.put(node.getId(), newRank + (dampingFactor * incomingRankSum));
            }
            pageRankScores = newPageRankScores;
        }
        return pageRankScores;
    }


    private static int countOutgoingCalls(Graph graph, GraphNode node) {
        return (int) node.getOutgoingLinks().stream()
                .filter(link -> link.getType() == GraphLink.LinkType.CALLS)
                .count();
    }

    public static int calculateNodeOutgoingLinkCount(Graph graph, String nodeId) {
        return graph.getNode(nodeId)
                .map(node -> (int) node.getOutgoingLinks().stream()
                        .filter(link -> link.getType() == GraphLink.LinkType.CALLS
                                || link.getType() == GraphLink.LinkType.COMPOSES)
                        .count())
                .orElse(0);
    }


    public static Optional<GraphNode> findStartingNode(Graph graph) {
        return graph.getNodes().stream()
                .filter(node -> graph.getIncomingLinks(node.getId()).isEmpty()) // must have no incoming
                .max(Comparator.comparingInt(node -> {
                    int directOut = graph.getOutgoingLinks(node.getId()).size();
                    int childOut = graph.getOutgoingLinks(node.getId()).stream()
                            .map(link -> graph.getNode(link.getTargetID()).orElse(null))
                            .filter(Objects::nonNull)
                            .mapToInt(child -> graph.getOutgoingLinks(child.getId()).size())
                            .sum();
                    return directOut + childOut;
                }));
    }


    public static String bfs(Graph graph, String startNodeId, int depthLimit) {
        StringBuilder traversalResult = new StringBuilder("BFS Traversal starting from ").append(startNodeId).append(" with depth limit ").append(depthLimit).append(":\n");
        Queue<Map.Entry<GraphNode, Integer>> queue = new LinkedList<>();
        Set<String> visited = new HashSet<>();

        Optional<GraphNode> startNodeOpt = graph.getNode(startNodeId);
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
                String neighborId = link.getTargetID();
                if (!visited.contains(neighborId)) {
                    graph.getNode(neighborId).ifPresent(neighborNode -> {
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

        Optional<GraphNode> startNodeOpt = graph.getNode(startNodeId);
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
                String neighborId = link.getTargetID();
                Optional<GraphNode> neighborNodeOpt = graph.getNode(neighborId);

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

    public static String dfsTraversalToString(Graph graph, String startNodeQuery, int depthLimit) {
        StringBuilder result = new StringBuilder();
        Set<String> visited = new HashSet<>();
        List<GraphLink> foundLinks = new ArrayList<>();

        Optional<GraphNode> startNodeOpt = graph.getNode(startNodeQuery);
        if (startNodeOpt.isEmpty()) {
            return "Start node not found: " + startNodeQuery;
        }

        // recursive DFS
        dfsHelper(graph, startNodeOpt.get().getId(), depthLimit, visited, foundLinks);

        result.append("DFS from ").append(startNodeOpt.get().getLabel())
                .append(" (depth = ").append(depthLimit).append(")\n");
        result.append("========================\n");
//
//        result.append("Visited Nodes (Total: ").append(visited.size()).append("):\n");
//        visited.forEach(nodeId -> graph.getNode(nodeId).ifPresent(node ->
//                result.append("  - ").append(node.getId())
//                        .append(" (").append(node.getLabel()).append(")\n")
//        ));

        result.append("\nLinks (Total: ").append(foundLinks.size()).append("):\n");
        foundLinks.forEach(link -> result.append("  - ")
                .append(link.getSourceID())
                .append(" --(").append(link.getType()).append(")--> ")
                .append(link.getTargetID())
                .append("\n"));

        result.append("========================\n");
        return result.toString();
    }

    private static void dfsHelper(Graph graph, String currentId, int depth,
                                  Set<String> visited, List<GraphLink> foundLinks) {
        if (depth < 0 || visited.contains(currentId)) return;

        visited.add(currentId);

        if (depth == 0) return; // stop exploring deeper

        for (GraphLink link : graph.getOutgoingLinks(currentId)) {
            foundLinks.add(link);
            dfsHelper(graph, link.getTargetID(), depth - 1, visited, foundLinks);
        }
    }

}
