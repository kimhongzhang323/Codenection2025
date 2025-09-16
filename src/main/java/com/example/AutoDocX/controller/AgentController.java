package com.example.AutoDocX.controller;

import com.example.AutoDocX.service.ApiResponse;
import com.example.AutoDocX.service.GlobalExceptionHandler;
import com.example.AutoDocX.service.Agent;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger; // Added import
import org.slf4j.LoggerFactory; // Added import

@RestController
@RequestMapping("/api/agent")
public class AgentController {

    private static final Logger logger = LoggerFactory.getLogger(AgentController.class); // Added logger

    private final Agent agent;

    @Autowired
    public AgentController(Agent agent) {
        this.agent = agent;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentRequest {
        private String gitUrl;
        private String userPrompt;
    }

    @PostMapping("/run-tool")
    public ResponseEntity<ApiResponse<?>> runTool(@RequestBody AgentRequest request) {
        try {
            String response = agent.handlePrompt(request.getGitUrl(), request.getUserPrompt());
            return new ResponseEntity<>(new ApiResponse<>("SUCCESS", "Agent processed prompt successfully.", response), HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Error processing agent prompt: {}", e.getMessage(), e); // Log the exception
            return GlobalExceptionHandler.errorResponseEntity("Error processing agent prompt: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}