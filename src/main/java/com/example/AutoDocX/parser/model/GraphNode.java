package com.example.AutoDocX.parser.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
public class GraphNode {
    private String id;
    private String label;
    private NodeType type;
    private String filePath;
    private int startLine;
    private int endLine;
    private String code; // full code chunk (class or method)
    private List<GraphLink> incomingLinks = new ArrayList<>();
    private List<GraphLink> outgoingLinks = new ArrayList<>();
    private Date lastModified;

    public GraphNode(String id, String name, NodeType type, String filePath, int startLine, int endLine, String code, List<GraphLink> incomingLinks, List<GraphLink> outgoingLinks, Date lastModified) {
        this.id = id;
        this.label = name;
        this.type = type;
        this.filePath = filePath;
        this.startLine = startLine;
        this.endLine = endLine;
        this.code = code;
        this.incomingLinks = incomingLinks;
        this.outgoingLinks = outgoingLinks;
        this.lastModified = lastModified;
    }

    public enum NodeType {
        CLASS,
        METHOD
    }

    public boolean isModified(Date compareDate) {
        if (this.lastModified == null || compareDate == null) {
            return false; // Or handle as an error/special case
        }
        return this.lastModified.after(compareDate);
    }

    @Override
    public String toString() {
        return String.format("Node (ID: %s, Label: %s, Type: %s)", id, label, type);
    }
}
