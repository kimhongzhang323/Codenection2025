package com.example.AutoDocX.service.agent.util;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

public class AgentUtil {
    public static String loadSystemPrompt(String filename) {
        try {
            return new String(
                    Files.readAllBytes(Paths.get("src/main/resources/prompt/" + filename))
            );
        } catch (IOException e) {
            throw new RuntimeException("Failed to load system prompt file: " + filename, e);
        }
    }
}
