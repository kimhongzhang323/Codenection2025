package com.example.AutoDocX.service;

import com.example.AutoDocX.model.repo.Model;
import com.example.AutoDocX.model.repo.SendMessageResult;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SummarizerService {
    @Autowired
    @Qualifier("geminiCentral")
    private Model model;

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

            // Create content for Gemini API
            Content content = Content.builder()
                    .role("user")
                    .parts(Part.builder().text(promptBuilder.toString()).build())
                    .build();
            
            List<Content> contents = List.of(content);
            
            // Call the Gemini model using the proper interface
            SendMessageResult result = model.sendMessage(contents, List.of());
            
            if (result != null && result.getText().isPresent()) {
                return result.getText().get();
            } else if (result != null && result.getErrorMessage().isPresent()) {
                throw new RuntimeException("Gemini model error: " + result.getErrorMessage().get());
            } else {
                throw new RuntimeException("No response received from Gemini model");
            }

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate summary: " + e.getMessage(), e);
        }
    }
}
