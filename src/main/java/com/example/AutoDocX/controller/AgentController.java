package com.example.AutoDocX.controller;

import com.example.AutoDocX.service.model.Agent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agent")
public class AgentController {
    private final Agent agent;

    @Autowired
    public AgentController(Agent agent) {
        this.agent = agent;
    }

    @PostMapping("/run-tool")
    public String runTool(@RequestParam String gitUrl, @RequestParam String userPrompt) {
        return agent.handlePrompt(gitUrl, userPrompt);
    }
}
