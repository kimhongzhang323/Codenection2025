package com.example.AutoDocX.service.memory;

import java.util.ArrayList;
import java.util.List;

public class Memory {
    private final List<MemoryEntry> entries = new ArrayList<>();

    public void addEntry(String query, String result) {
        MemoryEntry newEntry = new MemoryEntry(query, result);

        // Iterate in reverse to safely remove elements
        for (int i = entries.size() - 1; i >= 0; i--) {
            MemoryEntry existingEntry = entries.get(i);

            // Case 1: Existing entry contains the new entry's result (and they are not identical)
            if (existingEntry.getResult().contains(newEntry.getResult()) && !existingEntry.getResult().equals(newEntry.getResult())) {
                String updatedResult = existingEntry.getResult().replace(newEntry.getResult(), "").trim();
                existingEntry.setResult(updatedResult);
            }
            // Case 2: New entry contains the existing entry's result (and they are not identical)
            else if (newEntry.getResult().contains(existingEntry.getResult()) && !existingEntry.getResult().equals(newEntry.getResult())) {
                entries.remove(i);
            }
        }

        entries.add(newEntry);
    }

    public List<MemoryEntry> getEntries() {
        return new ArrayList<>(entries);
    }

    public static class MemoryEntry {
        private final String query;
        private String result; // Made mutable

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

        public void setResult(String result) { // Added setter
            this.result = result;
        }
    }
}
