package com.example.AutoDocX.controller;

import com.example.AutoDocX.service.agent.DocumentRewriteAgent;
import com.example.AutoDocX.service.agent.DocumentRewriteAgent.RewriteStyle;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rewrite")
@CrossOrigin(origins = "*")
public class DocumentRewriteController {

    @Autowired
    private DocumentRewriteAgent documentRewriteAgent;

    /**
     * Rewrite content with specified style
     */
    @PostMapping("/style")
    public ResponseEntity<?> rewriteWithStyle(@RequestBody RewriteRequest request) {
        try {
            RewriteStyle style = RewriteStyle.valueOf(request.getStyle().toUpperCase());
            String result = documentRewriteAgent.rewriteContent(
                request.getContent(), 
                style, 
                request.getAdditionalInstructions()
            );
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "result", result,
                "style", style.name()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", "Invalid rewrite style: " + request.getStyle()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Failed to rewrite content: " + e.getMessage()
            ));
        }
    }

    /**
     * Rewrite content with custom instructions
     */
    @PostMapping("/custom")
    public ResponseEntity<?> rewriteWithCustomInstructions(@RequestBody CustomRewriteRequest request) {
        try {
            String result = documentRewriteAgent.rewriteWithCustomInstructions(
                request.getContent(),
                request.getInstructions()
            );
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "result", result
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Failed to rewrite content: " + e.getMessage()
            ));
        }
    }

    /**
     * Improve grammar and clarity
     */
    @PostMapping("/improve")
    public ResponseEntity<?> improveContent(@RequestBody ContentRequest request) {
        try {
            String result = documentRewriteAgent.improveGrammarAndClarity(request.getContent());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "result", result
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Failed to improve content: " + e.getMessage()
            ));
        }
    }

    /**
     * Get suggestions for improvement
     */
    @PostMapping("/suggest")
    public ResponseEntity<?> getSuggestions(@RequestBody ContentRequest request) {
        try {
            String suggestions = documentRewriteAgent.suggestImprovements(request.getContent());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "suggestions", suggestions
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Failed to generate suggestions: " + e.getMessage()
            ));
        }
    }

    /**
     * Get available rewrite styles
     */
    @GetMapping("/styles")
    public ResponseEntity<?> getAvailableStyles() {
        try {
            List<Map<String, String>> styles = documentRewriteAgent.getAvailableStyles();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "styles", styles
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Failed to get styles: " + e.getMessage()
            ));
        }
    }

    // Request DTOs
    public static class RewriteRequest {
        private String content;
        private String style;
        private String additionalInstructions;

        // Getters and setters
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        
        public String getStyle() { return style; }
        public void setStyle(String style) { this.style = style; }
        
        public String getAdditionalInstructions() { return additionalInstructions; }
        public void setAdditionalInstructions(String additionalInstructions) { 
            this.additionalInstructions = additionalInstructions; 
        }
    }

    public static class CustomRewriteRequest {
        private String content;
        private String instructions;

        // Getters and setters
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        
        public String getInstructions() { return instructions; }
        public void setInstructions(String instructions) { this.instructions = instructions; }
    }

    public static class ContentRequest {
        private String content;

        // Getters and setters
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
    }
}