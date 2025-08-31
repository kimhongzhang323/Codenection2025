package com.example.AutoDocX.service.memory;

import java.util.ArrayList;
import java.util.List;

public class Memory {
    public static class MemoryEntry {
        private final String system;
        private final String queryMemory;
        private final String userInput;
        public MemoryEntry(String system, String queryMemory, String userInput) {
            this.system = system;
            this.queryMemory = queryMemory;
            this.userInput = userInput;
        }
        public String getSystem() { return system; }
        public String getQueryMemory() { return queryMemory; }
        public String getUserInput() { return userInput; }
    }
    private final List<MemoryEntry> entries = new ArrayList<>();
    public void addEntry(String system, String queryMemory, String userInput) {
        entries.add(new MemoryEntry(system, queryMemory, userInput));
    }
    public List<MemoryEntry> getEntries() {
        return new ArrayList<>(entries);
    }
}
