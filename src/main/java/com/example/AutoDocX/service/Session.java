package com.example.AutoDocX.service;

import com.example.AutoDocX.model.config.AgentConfig;

import java.util.concurrent.atomic.AtomicBoolean;

public class Session {
    private final String gitUrl;
    private final String branch;
    private final Memory memory;
    private final AgentConfig agentConfig;
    private final DocumentationHandler documentationHandler;
    private boolean initialStructureLogged = false;
    private final AtomicBoolean isGeneralSummaryRunning = new AtomicBoolean(false);

    public Session(String gitUrl, String branch) {
        this.gitUrl = gitUrl;
        this.branch = branch;
        this.memory = new Memory();
        this.agentConfig = new AgentConfig();
        this.documentationHandler = new DocumentationHandler();
    }

    public String getGitUrl() {
        return gitUrl;
    }

    public String getBranch() {
        return branch;
    }

    public Memory getMemory() {
        return memory;
    }

    public AgentConfig getAgentConfig() {
        return agentConfig;
    }

    public DocumentationHandler getDocumentationHandler() {
        return documentationHandler;
    }

    public boolean isInitialStructureLogged() {
        return initialStructureLogged;
    }

    public void setInitialStructureLogged(boolean initialStructureLogged) {
        this.initialStructureLogged = initialStructureLogged;
    }

    public AtomicBoolean getIsGeneralSummaryRunning() {
        return isGeneralSummaryRunning;
    }
}
