package com.example.AutoDocX.controller;

import com.example.AutoDocX.service.ApiResponse;
import com.example.AutoDocX.service.Agent;
import com.example.AutoDocX.service.GeneralSummaryAgent;
import com.example.AutoDocX.service.DocumentationAgent;
import com.example.AutoDocX.service.dto.DocParams;
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
            String summary = generalSummaryAgent.run(request.getGitUrl(), request.getBranch());
            return ResponseEntity.ok(new ApiResponse<>("SUCCESS", "Summary agent finished.", summary));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse<>("ERROR", e.getMessage(), null));
        }
    }

    @PostMapping("/run-doc")
    public ResponseEntity<ApiResponse<String>> runDocumentation(@RequestBody DocAgentRequest request) {
        try {
            DocParams params = new DocParams();
            if (request.getAudience() != null) params.setAudience(request.getAudience());
            if (request.getTone() != null) params.setTone(request.getTone());
            if (request.getFormat() != null) params.setFormat(request.getFormat());

            String doc = documentationAgent.run(request.getGitUrl(), request.getBranch(), request.getUserPrompt(), params);
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

@Data
@NoArgsConstructor
@AllArgsConstructor
class DocAgentRequest {
    private String gitUrl;
    private String userPrompt;
    private String branch;
    private String audience; // optional
    private String tone;     // optional
    private String format;   // optional
    private java.util.List<String> sections; // optional preferred sections
}