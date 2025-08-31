package com.example.AutoDocX.service.memory;

import java.util.ArrayList;
import java.util.List;

public class Memory {
    private final List<MemoryEntry> entries = new ArrayList<>();

    public void addEntry(String query, String result) {
        entries.add(new MemoryEntry(query, result));
    }

    public List<MemoryEntry> getEntries() {
        return new ArrayList<>(entries);
    }

    public static class MemoryEntry {
        private final String query;
        private final String result;

        public MemoryEntry(String query, String result) {
            this.query = query;
            this.result = result;
        }

        public String getQuery() {
            return query;
        }

        public String getResult() {
            return result;
        }
    }
}
