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

    public GeminiModel(@Value("${gemini.model.name}") String modelName, @Value("${gemini.api.key}") String apiKey) {
        this.genaiClient = Client.builder().apiKey(apiKey).build();
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

            if (response.candidates().isPresent() && !response.candidates().get().isEmpty()) {
                com.google.genai.types.Content candidateContent = response.candidates().get().get(0).content().get();
                if (candidateContent != null && candidateContent.parts().isPresent() && !candidateContent.parts().get().isEmpty()) {
                    Part firstPart = candidateContent.parts().get().get(0);
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