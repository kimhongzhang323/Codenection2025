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
