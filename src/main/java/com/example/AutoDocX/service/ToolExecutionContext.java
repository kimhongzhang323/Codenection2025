package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.parser.model.Graph;
import lombok.Getter;

@Getter
public class ToolExecutionContext {
    private final ClonedRepo repo;
    private final Graph graph;
    private final Session session;

    public ToolExecutionContext(ClonedRepo repo, Graph graph, Session session) {
        this.repo = repo;
        this.graph = graph;
        this.session = session;
    }

}
