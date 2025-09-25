package com.example.AutoDocX.service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocParams {
    private String audience; // e.g., "engineers", "admins"
    private String tone;     // e.g., "concise", "friendly", "formal"
    private String depth;    // e.g., "overview", "detailed"
    private String format;   // e.g., "markdown", "html"
    private Map<String, String> extra; // optional free-form params
}
