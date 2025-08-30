package com.example.AutoDocX.parser.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GraphLink {
    private String source;
    private String target;
    private LinkType type;

    public enum LinkType {
        CONTAINS,
        CALLS,
        USES
    }

    @Override
    public String toString() {
        return String.format("Link (Source: %s, Target: %s, Type: %s)", source, target, type);
    }
}
