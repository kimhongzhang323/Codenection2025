package com.example.AutoDocX.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.util.*;

/**
 *
 * - episodic: user messages + tool calls + tool results (audit/log)
 * - code: successful code fetches (read_file, get_code) - suitable for summarization
 * - structure: graph/structure results (central nodes, neighbor subgraph, folder tree)
 *
 * Each MemoryStore supports pretty-printing of the latest N entries and stores entries as (key, valueString).
 */
public class Memory {

    // Tunable truncation to avoid huge noisy entries in code/structure stores
    private static final int MAX_STORE_CHARS = 5000; // change as needed
    private static final String TRUNCATION_NOTICE = "... [TRUNCATED]";

    private final MemoryStore episodic = new MemoryStore("Episodic");
    private final MemoryStore code = new MemoryStore("Code");
    private final MemoryStore structure = new MemoryStore("Structure");

    public MemoryStore episodic() { return episodic; }
    public MemoryStore code() { return code; }
    public MemoryStore structure() { return structure; }

    /**
     * Pretty-print all stores, each limited to latestN entries.
     */
    public String prettyPrintAll(int latestN) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== Episodic Memory ===\n").append(episodic.toString(latestN)).append("\n\n");
        sb.append("=== Code Memory ===\n").append(code.toString(latestN)).append("\n\n");
        sb.append("=== Structure Memory ===\n").append(structure.toString(latestN)).append("\n");
        return sb.toString();
    }

    /**
     * Return a summarized view of code memory suitable for inclusion in prompts.
     * This currently concatenates the latest maxEntries code entries into a single string.
     */
    public String summarizeCode(int maxEntries) {
        List<MemoryEntry> entries = code.getEntries();
        if (entries.isEmpty()) return "No code knowledge yet.";
        int start = Math.max(0, entries.size() - maxEntries);
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < entries.size(); i++) {
            MemoryEntry e = entries.get(i);
            sb.append(e.getQuery()).append(" -> ").append(e.getResult()).append("\n");
        }
        return sb.toString().trim();
    }

    // === Inner MemoryStore class ===

    public static class MemoryStore {
        private final String name;
        private final List<MemoryEntry> entries = new ArrayList<>();
        private final ObjectMapper mapper;

        public MemoryStore(String name) {
            this.name = name;
            this.mapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
        }

        /**
         * Add an entry where value can be any Object. Value will be serialized to JSON if possible,
         * otherwise toString() will be used.
         */
        public synchronized void addEntry(String key, Object value) {
            String valueStr;
            if (value == null) {
                valueStr = "null";
            } else {
                try {
                    // Try to pretty-print JSON for structured objects
                    valueStr = mapper.writeValueAsString(value);
                } catch (JsonProcessingException e) {
                    valueStr = value.toString();
                }
            }
            entries.add(new MemoryEntry(key, valueStr));
        }

        /**
         * Get entries as an unmodifiable list.
         */
        public synchronized List<MemoryEntry> getEntries() {
            return Collections.unmodifiableList(new ArrayList<>(entries));
        }

        /**
         * Pretty-print the latest 'latestN' entries as JSON-like list.
         * If latestN <= 0 or latestN >= total entries, prints all.
         */
        public synchronized String toString(int latestN) {
            List<MemoryEntry> slice;
            if (latestN > 0 && latestN < entries.size()) {
                slice = entries.subList(entries.size() - latestN, entries.size());
            } else {
                slice = new ArrayList<>(entries);
            }

            // Represent as list of maps for nicer JSON output
            List<Map<String, String>> asList = new ArrayList<>();
            for (MemoryEntry e : slice) {
                Map<String, String> m = new LinkedHashMap<>();
                m.put("key", e.getQuery());
                m.put("value", e.getResult());
                asList.add(m);
            }

            try {
                return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(asList);
            } catch (JsonProcessingException ex) {
                // fallback
                StringBuilder sb = new StringBuilder();
                for (MemoryEntry e : slice) {
                    sb.append(e.getQuery()).append(": ").append(e.getResult()).append("\n");
                }
                return sb.toString();
            }
        }

        @Override
        public synchronized String toString() {
            return toString(entries.size());
        }
    }

    /**
     * A simple pair representing a memory entry.
     */
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

    // ---------- Helpers for safe storing from Agent ----------

    /**
     * Store code-like content but truncate if too large.
     * Use when you want to persist code readouts into code memory without noise explosion.
     */
    public void addCodeEntry(String key, String content) {
        if (content == null) content = "null";
        String toStore = content;
        if (content.length() > MAX_STORE_CHARS) {
            toStore = content.substring(0, MAX_STORE_CHARS) + TRUNCATION_NOTICE;
        }
        this.code.addEntry(key, toStore);
        // Always also log full result in episodic for audit
        this.episodic.addEntry("code_store_log:" + key, content.length() > MAX_STORE_CHARS ? (content.substring(0, MAX_STORE_CHARS) + TRUNCATION_NOTICE) : content);
    }

    /**
     * Store structure-like content but truncate if too large.
     */
    public void addStructureEntry(String key, String content) {
        if (content == null) content = "null";
        String toStore = content;
        if (content.length() > MAX_STORE_CHARS) {
            toStore = content.substring(0, MAX_STORE_CHARS) + TRUNCATION_NOTICE;
        }
        this.structure.addEntry(key, toStore);
        // Log to episodic as well (audit)
        this.episodic.addEntry(key, content.length() > MAX_STORE_CHARS ? (content.substring(0, MAX_STORE_CHARS) + TRUNCATION_NOTICE) : content);
    }
}
