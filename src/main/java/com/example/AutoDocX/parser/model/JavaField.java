package com.example.AutoDocX.parser.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JavaField {
    private String name;
    private String type;
    private String accessModifier;
    private int startLine;
    private int endLine;
    private String filePath;

    @Override
    public String toString() {
        return String.format("  Field: %s %s %s\n", accessModifier, type, name);
    }
}
