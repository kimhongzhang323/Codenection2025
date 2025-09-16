package com.example.AutoDocX.service;

public class Session {
    private final String gitUrl;
    private final Memory memory;
    private boolean initialStructureLogged = false;

    public Session(String gitUrl) {
        this.gitUrl = gitUrl;
        this.memory = new Memory();
    }

    public String getGitUrl() {
        return gitUrl;
    }

    public Memory getMemory() {
        return memory;
    }

    public boolean isInitialStructureLogged() {
        return initialStructureLogged;
    }

    public void setInitialStructureLogged(boolean initialStructureLogged) {
        this.initialStructureLogged = initialStructureLogged;
    }
}
