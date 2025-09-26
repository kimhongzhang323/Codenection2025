package com.example.AutoDocX.service;

import com.example.AutoDocX.model.Documentation;
import com.example.AutoDocX.model.config.AgentConfig;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.Map;

@Getter
public class Session {
    private final String gitUrl;
    private final String branch;
    private final Memory memory;
    private final DocumentationHandler documentationHandler;
    private final AgentConfig agentConfig;
    @Setter
    private boolean initialStructureLogged = false;
    @Setter
    private boolean documentationLoaded = false;

    public Session(String gitUrl, String branch) {
        this.gitUrl = gitUrl;
        this.branch = branch;
        this.memory = new Memory();
        this.documentationHandler = new DocumentationHandler();
        this.agentConfig = new AgentConfig();
    }

    public Map<String, Documentation> getDocumentation() {
        return documentationHandler.getAll();
    }

    public void setDocumentation(Map<String, Documentation> documentation) {
        documentation.forEach(documentationHandler::save);
    }

}
