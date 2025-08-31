package com.example.AutoDocX.service;

import com.example.AutoDocX.service.memory.Memory;

public class Session {
    private final String gitUrl;
    private final Memory memory;

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
}
