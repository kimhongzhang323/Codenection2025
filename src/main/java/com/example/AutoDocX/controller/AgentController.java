package com.example.AutoDocX.controller;

import com.example.AutoDocX.service.ApiResponse;
import com.example.AutoDocX.service.Agent;
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
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class AgentRequest {
    private String gitUrl;
    private String userPrompt;
    private String branch;
}