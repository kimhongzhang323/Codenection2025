package com.example.AutoDocX.service.agent.memory;

import lombok.Getter;

import java.util.*;

@Getter
public class EpisodicMemory implements MemoryInterface {
    private static final int MAX_ROUNDS = 5; // maximum number of MemoryStore in list
    private final Queue<MemoryStore> rounds = new LinkedList<>();
    private final String name;

    public EpisodicMemory(String name) {
        this.name = name;
        newRound(); // Start with the first round
    }

    public synchronized void newRound() {
        if (rounds.size() >= MAX_ROUNDS) {
            rounds.poll(); // Remove the oldest round
        }
        rounds.offer(new MemoryStore("Round " + (rounds.size() + 1)));
    }

    @Override
    public synchronized void addEntry(String key, Object text) {
        if (rounds.isEmpty()) {
            newRound();
        }
        if (!rounds.isEmpty())
            rounds.peek().addEntry(key, text);
    }

    public synchronized void addEntry(String role, String text, int roundIndex) {
        if (roundIndex >= 0 && roundIndex < rounds.size()) {
            ((LinkedList<MemoryStore>) rounds).get(roundIndex).addEntry(role, text);
        } else {
            throw new IllegalArgumentException("Invalid round index: " + roundIndex);
        }
    }

    @Override
    public synchronized void removeEntry(String key) {
        for (MemoryStore store : rounds) {
            store.removeEntry(key);
        }
    }

    @Override
    public synchronized void replaceEntry(String key, Object value) {
        removeEntry(key);
        addEntry(key, value.toString());
    }

    @Override
    public synchronized String getEntry(String key) {
        Object rawEntry = getRawEntry(key);
        return rawEntry != null ? rawEntry.toString() : null;
    }

    @Override
    public Object getRawEntry(String key) {
        for (MemoryStore store : rounds) {
            Object entry = store.getRawEntry(key);
            if (entry != null) {
                return entry;
            }
        }
        return null;
    }

    @Override
    public synchronized List<MemoryEntry> getEntries() {
        List<MemoryEntry> allEntries = new LinkedList<>();
        for (MemoryStore store : rounds) {
            allEntries.addAll(store.getEntries());
        }
        return Collections.unmodifiableList(allEntries);
    }

    public synchronized List<MemoryInterface.MemoryEntry> getRoundEntries(int roundIndex) {
        if (roundIndex >= 0 && roundIndex < rounds.size()) {
            return ((LinkedList<MemoryStore>) rounds).get(roundIndex).getEntries();
        } else {
            throw new IllegalArgumentException("Invalid round index: " + roundIndex);
        }
    }

    public synchronized List<MemoryInterface.MemoryEntry> getLatestNRoundEntries(int n) {
        return rounds.stream()
                .skip(Math.max(0, rounds.size() - n))
                .flatMap(round -> round.getEntries().stream())
                .toList();
    }

    @Override
    public synchronized void clear() {
        rounds.clear();
        newRound(); // Ensure there's always at least one round
    }

    @Override
    public synchronized boolean isEmpty() {
        return rounds.stream().allMatch(MemoryStore::isEmpty);
    }

    public synchronized String toString(int latestNPerRound) {
        StringBuilder sb = new StringBuilder();
        for (MemoryStore round : rounds) {
            sb.append(round.toString(latestNPerRound));
            sb.append("\n");
        }
        return sb.toString();
    }

    @Override
    public synchronized String toString() {
        return toString(Integer.MAX_VALUE); // Print all entries in all rounds
    }
}
