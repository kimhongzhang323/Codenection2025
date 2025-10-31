package com.example.AutoDocX.service.agent.util;

import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class AgentUtil {
    public static String loadSystemPrompt(String filename) {
        try {
            ClassPathResource resource = new ClassPathResource("prompt/" + filename);
            try (InputStream inputStream = resource.getInputStream()) {
                return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to load system prompt file: " + filename, e);
        }
    }
}
