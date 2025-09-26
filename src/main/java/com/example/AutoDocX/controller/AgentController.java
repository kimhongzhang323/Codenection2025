package com.example.AutoDocX.controller;

import com.example.AutoDocX.service.ApiResponse;
import com.example.AutoDocX.service.Agent;
import com.example.AutoDocX.service.GeneralSummaryAgent;
import com.example.AutoDocX.service.DocumentationAgent;
import com.example.AutoDocX.service.SummaryAgent;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agent")
@AllArgsConstructor
public class AgentController {
    private final Agent agent;
    private final GeneralSummaryAgent generalSummaryAgent;
    private final DocumentationAgent documentationAgent;
    private final SummaryAgent summaryAgent;

    @PostMapping("/get-response")
    public ResponseEntity<ApiResponse<String>> getResponse(@RequestBody AgentRequest request) {
        try {
            String response = agent.handlePrompt(request.getGitUrl(), request.getUserPrompt(), request.getBranch());
            return ResponseEntity.ok(new ApiResponse<>("SUCCESS", "Agent returned a response.", response));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("ERROR", e.getMessage(), null));
        }
    }

    @PostMapping("/run-summary")
    public ResponseEntity<ApiResponse<String>> runSummary(@RequestBody AgentRequest request) {
        try {
            String summary = summaryAgent.run(request.getGitUrl(), request.getBranch(), request.getUserPrompt(), 0);
            return ResponseEntity.ok(new ApiResponse<>("SUCCESS", "Summary agent finished.", summary));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("ERROR", e.getMessage(), null));
        }
    }

    @PostMapping("/run-general-summary")
    public ResponseEntity<ApiResponse<String>> runGeneralSummary(@RequestBody AgentRequest request) {
        try {
            String summary = generalSummaryAgent.run(request.getGitUrl(), request.getBranch());
            return ResponseEntity.ok(new ApiResponse<>("SUCCESS", "General summary agent finished.", summary));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("ERROR", e.getMessage(), null));
        }
    }

    @PostMapping("/run-doc")
    public ResponseEntity<ApiResponse<String>> runDocumentation(@RequestBody AgentRequest request) {
        try {
            String doc = documentationAgent.run(request.getGitUrl(), request.getBranch(), request.getUserPrompt());
            return ResponseEntity.ok(new ApiResponse<>("SUCCESS", "Documentation agent finished.", doc));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("ERROR", e.getMessage(), null));
        }
    }
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class AgentRequest {
    private String gitUrl;
    private String userPrompt;
    private String branch;
}