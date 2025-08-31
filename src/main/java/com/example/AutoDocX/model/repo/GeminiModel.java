package com.example.AutoDocX.model.repo;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentParameters;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;
import com.google.genai.types.GenerateContentConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.stream.Collectors;

@Service("geminiModel")
public class GeminiModel implements Model {

    private final Client genaiClient;
    private final String modelName;

    public GeminiModel(@Value("${gemini.model.name}") String modelName) {
        this.genaiClient = new Client();
        this.modelName = modelName;
    }

    @Override
    public Map<String, Object> sendMessage(List<Content> contents, List<Tool> tools) {
        Map<String, Object> result = new HashMap<>();
        try {
            GenerateContentConfig config = GenerateContentConfig.builder()
                    .tools(tools)
                    .build();

            GenerateContentResponse response = genaiClient.models.generateContent(
                    modelName,
                    contents,
                    config
            );

            if (response.candidates().isPresent() && response.candidates().isPresent()) {
                com.google.genai.types.Content candidateContent = response.candidates().get().get(0).content().get();
                if (candidateContent != null && candidateContent.parts().isPresent() && !candidateContent.parts().isEmpty()) {
                    Part firstPart = (Part) candidateContent.parts().get();
                    if (firstPart.functionCall().isPresent()) {
                        result.put("tool", firstPart.functionCall().get().name());
                        result.put("param", firstPart.functionCall().get().args());
                    } else if (firstPart.text().isPresent()) {
                        String textResponse = candidateContent.parts().get().stream()
                                .filter(p -> p.text().isPresent())
                                .map(p -> p.text().get())
                                .collect(Collectors.joining());
                        result.put("final_answer", textResponse);
                    }
                } else if (response.candidates().get().get(0).finishReason().isPresent() && !response.candidates().get().get(0).finishReason().toString().equals("STOP")) {
                    // Handle cases where finish reason is not STOP but no function call or text is present directly in the first part
                    // This might require more sophisticated parsing based on exact API behavior for such cases
                    // For now, if no text or function call is explicit in first part, and not STOP, we can try to get all text parts.
                    String textResponse = response.candidates().get().get(0).content().get().parts().get().stream()
                            .filter(p -> p.text().isPresent())
                            .map(p -> p.text().get())
                            .collect(Collectors.joining());
                    result.put("final_answer", textResponse);
                }
                else if (response.candidates().get().get(0).finishReason().isPresent() && response.candidates().get().get(0).finishReason().toString().equals("STOP")) {
                    String textResponse = response.candidates().get().get(0).content().get().parts().get().stream()
                            .filter(p -> p.text().isPresent())
                            .map(p -> p.text().get())
                            .collect(Collectors.joining());
                    result.put("final_answer", textResponse);
                }
            } else {
                result.put("final_answer", "No response from Gemini model.");
            }
        } catch (Exception e) {
            throw new RuntimeException("An unexpected error occurred", e);
        }
        return result;
    }
}
