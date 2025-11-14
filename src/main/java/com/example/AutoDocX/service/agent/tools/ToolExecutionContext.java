package com.example.AutoDocX.service.agent.tools;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.service.agent.data.Session;
import com.example.AutoDocX.service.agent.memory.EpisodicMemory;
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
