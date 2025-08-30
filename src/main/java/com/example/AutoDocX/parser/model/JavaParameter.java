package com.example.AutoDocX.parser.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JavaParameter {
    private String name;
    private String type;

    @Override
    public String toString() {
        return String.format("%s %s", type, name);
    }
}
