package com.example.AutoDocX.controller;

import com.example.AutoDocX.model.config.AgentConfig;
import com.example.AutoDocX.service.Session;
import com.example.AutoDocX.service.SessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    private final SessionManager sessionManager;

    @Autowired
    public ConfigController(SessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    @GetMapping
    public AgentConfig getConfig(@RequestParam String gitUrl, @RequestParam String branch) {
        Session session = sessionManager.getSession(gitUrl, branch);
        return session.getAgentConfig();
    }

    @PostMapping
    public AgentConfig updateConfig(@RequestParam String gitUrl, @RequestParam String branch, @RequestBody AgentConfig newConfig) {
        Session session = sessionManager.getSession(gitUrl, branch);
        AgentConfig config = session.getAgentConfig();

        if (newConfig.getAudience() != null) {
            config.setAudience(newConfig.getAudience());
        }
        if (newConfig.getTone() != null) {
            config.setTone(newConfig.getTone());
        }
        if (newConfig.getDepth() != null) {
            config.setDepth(newConfig.getDepth());
        }
        if (newConfig.getFormat() != null) {
            config.setFormat(newConfig.getFormat());
        }
        if (newConfig.getDocumentationTemplate() != null) {
            config.setDocumentationTemplate(newConfig.getDocumentationTemplate());
        }
        if (newConfig.getExtra() != null) {
            config.setExtra(newConfig.getExtra());
        }

        return config;
    }
}
