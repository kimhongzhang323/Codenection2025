package com.example.AutoDocX.model.repo;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;
import com.google.genai.types.GenerateContentConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Optional;

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
                var candidate = response.candidates().get().get(0);

                // If candidate has content, parse parts
                Optional<com.google.genai.types.Content> candidateContentOpt = candidate.content();
                if (candidateContentOpt.isPresent()) {
                    com.google.genai.types.Content candidateContent = candidateContentOpt.get();
                    List<Part> parts = candidateContent.parts().orElse(List.of());

                    // Gather text across parts and find the first function call (if any)
                    StringBuilder combinedText = new StringBuilder();
                    boolean sawFunctionCall = false;
                    String functionName = null;
                    Object functionArgs = null;

                    for (Part part : parts) {
                        // Append any text parts
                        part.text().ifPresent(t -> combinedText.append(t));

                        // Capture the first function call (if any)
                        if (!sawFunctionCall && part.functionCall().isPresent()) {
                            sawFunctionCall = true;
                            var fc = part.functionCall().get();
                            functionName = fc.name().orElse(null);
                            // args() is an Optional<Object> (could be Map or JSON-like)
                            functionArgs = fc.args().orElse(null);
                            // do not break — collect remaining text parts if present after this
                        }
                    }

                    // If the model issued a function call, prefer returning the tool + params
                    if (sawFunctionCall && functionName != null) {
                        result.put("tool", functionName);
                        result.put("param", functionArgs); // keep raw args (may be Optional/Map)
                        if (combinedText.length() > 0) {
                            result.put("assistant_text", combinedText.toString());
                        }
                        return result;
                    }

                    // No function call: treat text as final_answer
                    if (combinedText.length() > 0) {
                        result.put("final_answer", combinedText.toString());
                        return result;
                    }
                }

                // Fallback: if content absent but finish reason present, still try to gather text
                // (This mirrors earlier handling but in a safer, simpler form.)
                if (candidate.content().isEmpty()) {
                    // Try to convert candidate to a text fallback if possible
                    // If candidate content is missing, return a generic message
                    result.put("final_answer", "No textual content produced by model candidate.");
                }
            } else {
                result.put("final_answer", "No response from Gemini model.");
            }
        } catch (Exception e) {
            throw new RuntimeException("An unexpected error occurred while calling Gemini", e);
        }
        return result;
    }
}
