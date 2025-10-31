package com.example.AutoDocX.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentConfig {
    private String audience = "engineers";
    private String tone = "concise";
    private String depth = "detailed";
    private String format = "markdown";
    private String documentationTemplate = "";
    private Map<String, String> extra;

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("{Audience: ").append(audience).append(", ");
        sb.append("Tone: ").append(tone).append(", ");
        sb.append("Depth: ").append(depth).append(", ");
        sb.append("Format: ").append(format).append(", ");
        
        // JSON encode the template to preserve formatting and prevent injection
        if (documentationTemplate != null && !documentationTemplate.isEmpty()) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                String jsonEncodedTemplate = mapper.writeValueAsString(documentationTemplate);
                sb.append("Template: ").append(jsonEncodedTemplate);
            } catch (Exception e) {
                // Fallback to raw string if JSON encoding fails
                sb.append("Template: \"").append(documentationTemplate.replace("\"", "\\\"")).append("\"");
            }
        } else {
            sb.append("Template: \"\"");
        }
        
        if (extra != null && !extra.isEmpty()) {
            sb.append(", Extra: ").append(extra);
        }
        sb.append("}");
        return sb.toString();
    }
}
