package com.example.AutoDocX.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.Collections;

@RestController
@RequestMapping("/api")
public class StatusController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        // Returns a simple JSON response: {"status": "UP"}
        return ResponseEntity.ok(Collections.singletonMap("status", "UP"));
    }
}
