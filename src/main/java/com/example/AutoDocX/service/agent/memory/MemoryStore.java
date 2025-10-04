package com.example.AutoDocX.service.agent.memory;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class MemoryStore implements MemoryInterface {
    private final String name;
    private final List<MemoryEntry> entries = new ArrayList<>();
    private final ObjectMapper mapper;

    public MemoryStore(String name) {
        this.name = name;
        this.mapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    }

    @Override
    public synchronized void addEntry(String key, Object value) {
        String valueStr;
        if (value == null) {
            valueStr = "null";
        } else {
            try {
                valueStr = mapper.writeValueAsString(value);
            } catch (JsonProcessingException e) {
                valueStr = value.toString();
            }
        }
        entries.add(new MemoryEntry(key, valueStr));
    }

    @Override
    public synchronized void removeEntry(String key) {
        entries.removeIf(e -> e.getKey().equals(key));
    }

    @Override
    public synchronized void replaceEntry(String key, Object value) {
        removeEntry(key);
        addEntry(key, value);
    }

    @Override
    public synchronized String getEntry(String key) {
        Object rawEntry = getRawEntry(key);
        return rawEntry != null ? rawEntry.toString() : null;
    }

    @Override
    public Object getRawEntry(String key) {
        return entries.stream()
                .filter(entry -> entry.getKey().equals(key))
                .findFirst()
                .map(MemoryEntry::getResultRaw)
                .orElse(null);
    }

    @Override
    public synchronized List<MemoryEntry> getEntries() {
        return Collections.unmodifiableList(new ArrayList<>(entries));
    }

    @Override
    public synchronized void clear() {
        entries.clear();
    }

    @Override
    public synchronized boolean isEmpty() {
        return entries.isEmpty();
    }

    public String getName() {
        return name;
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

        StringBuilder sb = new StringBuilder();
        for (MemoryEntry e : slice) {
            sb.append(e.getKey()).append(": ").append(e.getValue()).append("\n");
        }
        return sb.toString();
    }

    @Override
    public synchronized String toString() {
        return toString(entries.size());
    }
}
