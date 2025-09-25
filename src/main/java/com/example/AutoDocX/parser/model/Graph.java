package com.example.AutoDocX.parser.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.ArrayList;
import java.util.Optional;
import java.util.stream.Collectors;

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

    public Optional<GraphNode> getNode(String query) {
        return nodes.stream().filter(node -> node.getId().equals(query) || node.getLabel().equals(query)).findFirst();
    }

    public List<GraphLink> getOutgoingLinks(String nodeId) {
        return links.stream()
                .filter(link -> link.getSourceID().equals(nodeId))
                .collect(Collectors.toList());
    }

    public List<GraphLink> getIncomingLinks(String nodeId) {
        return links.stream()
                .filter(link -> link.getTargetID().equals(nodeId))
                .collect(Collectors.toList());
    }

    public String listClassNodesToString() {
        StringBuilder sb = new StringBuilder();
        sb.append("Graph Representation:\n");

        sb.append("Nodes (Total: ").append(nodes.size()).append("):\n");
        nodes.forEach(node -> {
            if (node.getType() != GraphNode.NodeType.CLASS)
                return ;
            sb.append("  - ").append(node.getId())
                    .append(" (Type: ").append(node.getType())
//                    .append(", Label: ").append(node.getLabel())
                    .append(")\n");
        });

        return sb.toString();
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("Graph Representation:\n");
        sb.append("========================\n");

        sb.append("Nodes (Total: ").append(nodes.size()).append("):\n");
        nodes.forEach(node -> {
            sb.append("  - ").append(node.getId())
                    .append(" (Type: ").append(node.getType())
//                    .append(", Label: ").append(node.getLabel())
                    .append(")\n");
        });

        sb.append("\nLinks (Total: ").append(links.size()).append("):\n");
        links.forEach(link -> sb.append("  - ")
                .append(link.getSourceID())
                .append(" --(").append(link.getType()).append(")--> ")
                .append(link.getTargetID())
                .append("\n"));

        sb.append("========================\n");
        return sb.toString();
    }
}
