package com.example.AutoDocX.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class DocumentRewriteAgent {
    
    @Autowired
    private SummarizerService summarizerService;
    
    public enum RewriteStyle {
        FORMAL("Make this text more formal and professional"),
        CASUAL("Make this text more casual and conversational"),
        TECHNICAL("Make this text more technical and detailed"),
        CONCISE("Make this text more concise and to the point"),
        DETAILED("Expand this text with more details and explanations"),
        CLEAR("Make this text clearer and easier to understand");
        
        private final String prompt;
        
        RewriteStyle(String prompt) {
            this.prompt = prompt;
        }
        
        public String getPrompt() {
            return prompt;
        }
    }
    
    /**
     * Rewrite content using AI with specified style
     * @param content The original content to rewrite
     * @param style The rewrite style to apply
     * @param additionalInstructions Additional custom instructions
     * @return The rewritten content
     */
    public String rewriteContent(String content, RewriteStyle style, String additionalInstructions) {
        try {
            StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append(style.getPrompt());
            promptBuilder.append(":\n\n");
            
            if (additionalInstructions != null && !additionalInstructions.trim().isEmpty()) {
                promptBuilder.append("Additional instructions: ").append(additionalInstructions).append("\n\n");
            }
            
            promptBuilder.append("Original content:\n");
            promptBuilder.append(content);
            promptBuilder.append("\n\nRewritten content:");
            
            return summarizerService.summarize(promptBuilder.toString());
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to rewrite content: " + e.getMessage(), e);
        }
    }
    
    /**
     * Rewrite content with custom instructions
     * @param content The original content to rewrite
     * @param customInstructions Custom rewrite instructions
     * @return The rewritten content
     */
    public String rewriteWithCustomInstructions(String content, String customInstructions) {
        try {
            StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append("Rewrite the following content according to these instructions: ");
            promptBuilder.append(customInstructions);
            promptBuilder.append("\n\nOriginal content:\n");
            promptBuilder.append(content);
            promptBuilder.append("\n\nRewritten content:");
            
            return summarizerService.summarize(promptBuilder.toString());
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to rewrite content with custom instructions: " + e.getMessage(), e);
        }
    }
    
    /**
     * Improve grammar and clarity of the content
     * @param content The content to improve
     * @return The improved content
     */
    public String improveGrammarAndClarity(String content) {
        try {
            String prompt = "Improve the grammar, spelling, and clarity of the following text while maintaining its original meaning and tone:\n\n" 
                          + content + "\n\nImproved text:";
            
            return summarizerService.summarize(prompt);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to improve content: " + e.getMessage(), e);
        }
    }
    
    /**
     * Suggest improvements for the content
     * @param content The content to analyze
     * @return Suggestions for improvement
     */
    public String suggestImprovements(String content) {
        try {
            String prompt = "Analyze the following content and provide specific suggestions for improvement in terms of clarity, structure, grammar, and overall effectiveness:\n\n" 
                          + content + "\n\nSuggestions:";
            
            return summarizerService.summarize(prompt);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate suggestions: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get available rewrite styles
     * @return List of available rewrite styles
     */
    public List<Map<String, String>> getAvailableStyles() {
        return List.of(
            Map.of("key", "FORMAL", "name", "Formal", "description", "Professional and formal tone"),
            Map.of("key", "CASUAL", "name", "Casual", "description", "Conversational and relaxed tone"),
            Map.of("key", "TECHNICAL", "name", "Technical", "description", "Technical and detailed approach"),
            Map.of("key", "CONCISE", "name", "Concise", "description", "Brief and to the point"),
            Map.of("key", "DETAILED", "name", "Detailed", "description", "Comprehensive and thorough"),
            Map.of("key", "CLEAR", "name", "Clear", "description", "Easy to understand and follow")
        );
    }
}