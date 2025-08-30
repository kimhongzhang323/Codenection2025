package com.example.AutoDocX.service;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SummarizerService {
    @Autowired
    ChatModel model;

    public String summarize(String text) {
        return summarize(text, null);
    }

    public String summarize(String text, String context) {
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Text cannot be null or empty");
        }

        if (model == null) {
            throw new IllegalStateException("Model has not been initialized");
        }

        try {
            StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append("Please provide a concise summary of the following code file");

            if (context != null && !context.trim().isEmpty()) {
                promptBuilder.append(" (context: ").append(context).append(")");
            }

            promptBuilder.append(":\n\n")
                    .append(text.trim())
                    .append("\n\nFocus on the main purpose, key components, and overall functionality.");

            return model.call(promptBuilder.toString());

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate summary: " + e.getMessage(), e);
        }
    }
}
