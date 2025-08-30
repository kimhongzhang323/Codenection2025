package com.example.AutoDocX.parser.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JavaMethod {
    private String name;
    private String returnType;
    private List<JavaParameter> parameters;
    private List<String> thrownExceptions;
    private String body;
    private int startLine;
    private int endLine;
    private String filePath;

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("  Method: ").append(returnType).append(" ").append(name).append("(");
        for (int i = 0; i < parameters.size(); i++) {
            sb.append(parameters.get(i).toString());
            if (i < parameters.size() - 1) {
                sb.append(", ");
            }
        }
        sb.append(")");
        if (!thrownExceptions.isEmpty()) {
            sb.append(" throws ");
            for (int i = 0; i < thrownExceptions.size(); i++) {
                sb.append(thrownExceptions.get(i));
                if (i < thrownExceptions.size() - 1) {
                    sb.append(", ");
                }
            }
        }
        sb.append("\n");
        sb.append("    Body: ").append(body).append("\n");
        return sb.toString();
    }
}
