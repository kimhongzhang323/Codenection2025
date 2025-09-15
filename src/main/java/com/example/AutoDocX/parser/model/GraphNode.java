package com.example.AutoDocX.parser.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GraphNode {
    private String id;
    private String label;
    private NodeType type;
    private String filePath;
    private int startLine;
    private int endLine;
    private String code; // full code chunk (class or method)
    private List<GraphLink> outgoingLinks = new ArrayList<>();
    private List<GraphLink> incomingLinks = new ArrayList<>();

    private String clusterId;

    public enum NodeType {
        CLASS,
        METHOD
    }

    @Override
    public String toString() {
        return String.format("Node (ID: %s, Label: %s, Type: %s)", id, label, type);
    }
}
