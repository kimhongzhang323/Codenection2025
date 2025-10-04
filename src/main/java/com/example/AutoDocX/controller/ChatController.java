package com.example.AutoDocX.controller;

import com.example.AutoDocX.model.Model;
import com.example.AutoDocX.service.ApiResponse; // Added import for ApiResponse
import com.example.AutoDocX.service.GlobalExceptionHandler; // Added import for GlobalExceptionHandler
import com.google.genai.types.Content;     // Added import for Content
import com.google.genai.types.Part;        // Added import for Part
import com.google.genai.types.Tool;        // Added import for Tool
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList; // Added import for ArrayList
import java.util.Arrays;    // Added import for Arrays
import java.util.List;      // Added import for List
import java.util.Map;       // Added import for Map


@RestController
@RequestMapping("/api/ai")
public class ChatController {

    private final Model model;

    public ChatController(@Qualifier("geminiCentral") Model model) {
        this.model = model;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatRequest {
        private String role;
        private String content;
    }

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<?>> chat(@RequestBody ChatRequest chatRequest) {
        try {
            List<Content> contents = new ArrayList<>();
            contents.add(Content.builder().parts(Arrays.asList(Part.builder().text(chatRequest.getContent()).build())).build());

            List<Tool> tools = new ArrayList<>(); // Empty list of tools for now

            Map<String, Object> modelResponseMap = model.sendMessageOld(contents, tools);

            // Assuming modelResponseMap contains "final_answer" or similar for success
            if (modelResponseMap.containsKey("final_answer")) {
                String finalAnswer = (String) modelResponseMap.get("final_answer");
                return new ResponseEntity<>(new ApiResponse<>("SUCCESS", "AI response generated.", finalAnswer), HttpStatus.OK);
            } else {
                // Handle cases where the model returns a tool call or other structured response
                // For simplicity, returning the whole map for now. You might want to format this.
                return new ResponseEntity<>(new ApiResponse<>("SUCCESS", "AI response with tool call or structured data.", modelResponseMap), HttpStatus.OK);
            }

        } catch (Exception e) {
            return new ResponseEntity<>(new ApiResponse<>("FAIL", "Sorry, an error occurred while communicating with the AI service", e.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}