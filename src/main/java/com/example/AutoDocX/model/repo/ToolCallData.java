package com.example.AutoDocX.model.repo;

import lombok.Getter;

import java.util.Map;
import java.util.Objects;

@Getter
public class ToolCallData {
    private final String name;
    private final Map<String, Object> args;  // you can use Map<String,Object> if args are JSON-like

    public ToolCallData(String name, Map<String, Object> args) {
        this.name = name;
        this.args = args;
    }

    @Override
    public String toString() {
        return "FunctionCallData{name='" + name + "', args=" + args + "}";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ToolCallData that)) return false;
        return Objects.equals(name, that.name) && Objects.equals(args, that.args);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, args);
    }
}
