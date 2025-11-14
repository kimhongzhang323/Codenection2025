package com.example.AutoDocX.service.agent.memory;

import lombok.Getter;

import java.util.List;

/**
 * Represents the main memory handler, encapsulating different types of memory stores.
 * This class now uses EpisodicMemory for sumAgentLog and docAgentLog, and MemoryStore for others.
 * It also provides methods to manage and summarize these memory stores.
 */
@Getter
public class Memory {

    // Tunable truncation to avoid huge noisy entries in code/structure stores
    private static final int MAX_STORE_CHARS = 5000; // change as needed
    private static final String TRUNCATION_NOTICE = "... [TRUNCATED]";

    private final EpisodicMemory sumAgentLog = new EpisodicMemory("Summary Log");
    private final EpisodicMemory docAgentLog = new EpisodicMemory("Documentation Log");
    private final MemoryStore code = new MemoryStore("Code");
    private final MemoryStore structure = new MemoryStore("Structure");
    private final MemoryStore summary = new MemoryStore("Summary");
    private final MemoryStore plan = new MemoryStore("Plan");

    /**
     * Pretty-print all stores, each limited to latestN entries.
     */
    public String prettyPrintAll(int latestN) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== Summary Episodic Memory ===\n").append(sumAgentLog.toString(latestN)).append("\n\n");
        sb.append("=== Documentation Episodic Memory ===\n").append(docAgentLog.toString(latestN)).append("\n\n");
        sb.append("=== Code Memory ===\n").append(code.toString(latestN)).append("\n\n");
        sb.append("=== Structure Memory ===\n").append(structure.toString(latestN)).append("\n\n");
        sb.append("=== Summary Memory ===\n").append(summary.toString(latestN)).append("\n\n");
        sb.append("=== Plan Memory ===\n").append(plan.toString(latestN)).append("\n");
        return sb.toString();
    }

    /**
     * Return a summarized view of code memory suitable for inclusion in prompts.
     * This currently concatenates the latest maxEntries code entries into a single string.
     */
    public String summarizeCode(int maxEntries) {
        List<MemoryInterface.MemoryEntry> entries = code.getEntries();
        if (entries.isEmpty()) return "No code knowledge yet.";
        int start = Math.max(0, entries.size() - maxEntries);
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < entries.size(); i++) {
            MemoryInterface.MemoryEntry e = entries.get(i);
            sb.append(e.getKey()).append(" -> ").append(e.getResultRaw()).append("\n");
        }
        return sb.toString().trim();
    }

    public void newRound() {
        sumAgentLog.newRound();
        docAgentLog.newRound();
    }
}
