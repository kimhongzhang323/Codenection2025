package com.example.AutoDocX.service.agent.memory;

import lombok.Getter;

import java.util.List;

public interface MemoryInterface {
    void addEntry(String key, Object value);
    void removeEntry(String key);
    void replaceEntry(String key, Object value);
    String getEntry(String key);
    Object getRawEntry(String key);
    List<MemoryEntry> getEntries();
    void clear();
    boolean isEmpty();
    String toString(int n);

    // A simple pair representing a memory entry.
    class MemoryEntry {
        @Getter
        private final String key;
        private final Object value;

        public MemoryEntry(String key, Object value) {
            this.key = key;
            this.value = value;
        }

        public String getValue() {
            return value.toString();
        }

        public Object getResultRaw() {
            return value;
        }
    }
}
