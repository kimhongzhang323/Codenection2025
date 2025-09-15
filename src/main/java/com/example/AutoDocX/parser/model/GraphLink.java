package com.example.AutoDocX.parser.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GraphLink {
    private String sourceID;
    private String targetID;
    private LinkType type;

    public enum LinkType {
        CALLS,
        CONSTRUCTS,
        INHERITS,
        IMPLEMENTS,
        COMPOSES
    }

    @Override
    public String toString() {
        return String.format("Link (Source: %s, Target: %s, Type: %s)", sourceID, targetID, type);
    }
}
