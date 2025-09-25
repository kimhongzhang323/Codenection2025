package com.example.AutoDocX.service;

import com.example.AutoDocX.model.Documentation;

import java.util.HashMap;
import java.util.Map;

public class Session {
    private final String gitUrl;
    private final String branch;
    private final Memory memory;
    private final DocumentationHandler documentationHandler;
    private boolean initialStructureLogged = false;

    public Session(String gitUrl, String branch, DocumentationHandler documentationHandler) {
        this.gitUrl = gitUrl;
        this.branch = branch;
        this.memory = new Memory();
        this.documentationHandler = documentationHandler;
    }

    public Session(String gitUrl, DocumentationHandler documentationHandler) {
        this(gitUrl, null, documentationHandler);
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

    public Map<String, Documentation> getDocumentation() {
        return documentationHandler.getAll();
    }

    public void setDocumentation(Map<String, Documentation> documentation) {
        documentation.forEach(documentationHandler::save);
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
}
