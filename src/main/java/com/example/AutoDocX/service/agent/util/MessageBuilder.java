package com.example.AutoDocX.service.agent.util;

import com.example.AutoDocX.service.agent.memory.EpisodicMemory;
import com.example.AutoDocX.service.agent.memory.MemoryInterface;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;

import java.util.ArrayList;
import java.util.List;

public class MessageBuilder {
    private final List<Content> contents = new ArrayList<>();
    private List<Tool> tools = new ArrayList<>();

    public MessageBuilder addModel(String text) {
        contents.add(Content.builder().role("model").parts(List.of(Part.fromText(text))).build());
        return this;
    }

    public MessageBuilder addUser(String text) {
        contents.add(Content.builder().role("user").parts(List.of(Part.fromText(text))).build());
        return this;
    }

    public MessageBuilder addSystem(String text) {
        contents.add(Content.builder().role("user").parts(List.of(Part.fromText(text))).build());
        return this;
    }

    public MessageBuilder addTools(List<Tool> tools) {
        this.tools.addAll(tools);
        return this;
    }

    public MessageBuilder addMemory(MemoryInterface memory, int n) {
        contents.add(Content.builder().role("user").parts(List.of(
            Part.fromText("MEMORY:\n" + memory.toString(n)))).build()
        );
        return this;
    }

    public MessageBuilder addMemory(EpisodicMemory memory, int n) {
        for (MemoryInterface.MemoryEntry entry: memory.getLatestNRoundEntries(n)) {
            if (entry.getKey().equalsIgnoreCase("model"))
                addModel(entry.getValue());
            else
                addUser(entry.getValue());
        }
        return this;
    }

    public List<Content> build() {
        return new ArrayList<>(contents);
    }

    public List<Tool> getTools() {
        return new ArrayList<>(tools);
    }

    public void clear() {
        contents.clear();
        tools.clear();
    }
}
