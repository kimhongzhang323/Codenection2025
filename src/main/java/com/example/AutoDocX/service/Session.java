package com.example.AutoDocX.service;

public class Session {
    private final String gitUrl;
    private final String branch;
    private final Memory memory;
    private boolean initialStructureLogged = false;

    public Session(String gitUrl, String branch) {
        this.gitUrl = gitUrl;
        this.branch = branch;
        this.memory = new Memory();
    }

    public Session(String gitUrl) {
        this(gitUrl, null);
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

    public boolean isInitialStructureLogged() {
        return initialStructureLogged;
    }

    public void setInitialStructureLogged(boolean initialStructureLogged) {
        this.initialStructureLogged = initialStructureLogged;
    }
}
