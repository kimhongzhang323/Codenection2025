package com.example.AutoDocX.parser.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JavaClass {
    private String name;
    private String packageName;
    private List<JavaMethod> methods;
    private List<JavaField> fields;
    private List<String> imports;
    private int startLine;
    private int endLine;
    private String filePath;

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("Package: ").append(packageName).append("\n");
        sb.append("Class: ").append(name).append("\n");
        sb.append("Imports:\n");
        imports.forEach(i -> sb.append("  ").append(i).append("\n"));
        sb.append("Fields:\n");
        fields.forEach(f -> sb.append(f.toString()));
        sb.append("Methods:\n");
        methods.forEach(m -> sb.append(m.toString()));
        return sb.toString();
    }
}
