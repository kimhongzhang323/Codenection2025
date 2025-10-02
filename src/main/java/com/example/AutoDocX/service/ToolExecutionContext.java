package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.parser.model.Graph;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ToolExecutionContext {
    private final ClonedRepo repo;
    private final Graph graph;
    private final Session session;
    private final EpisodicMemory episodicMemory;
}
