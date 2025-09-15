package com.example.AutoDocX.model.repo;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;
import com.google.genai.types.FinishReason;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Service("geminiModel")
public class GeminiModel implements Model {

    private final Client genaiClient;
    private final String modelName;

    public GeminiModel(
            @Value("${gemini.model.name}") String modelName,
            @Value("${gemini.api.key}") String apiKey
    ) {
        this.genaiClient = Client.builder().apiKey(apiKey).build();
        this.modelName = modelName;
    }

    // New version
    public SendMessageResult sendMessageNew(List<Content> contents, List<Tool> tools) {
        try {
            var config = com.google.genai.types.GenerateContentConfig.builder()
                    .tools(tools)
                    .build();

            GenerateContentResponse response = genaiClient.models.generateContent(
                    modelName,
                    contents,
                    config
            );

            // Check candidates
            if (response.candidates().isEmpty() || response.candidates().get().isEmpty()) {
                // No candidate → treat as OUTPUT_ERROR
                return new SendMessageResult(
                        ModelFinishReason.OUTPUT_ERROR,
                        Optional.empty(),
                        List.of(),
                        Optional.empty(),
                        Optional.of("No response from Gemini model.")
                );
            }

            var candidate = response.candidates().get().get(0);

            // Determine finish reason from Gemini
            FinishReason.Known geminiFinish = candidate.finishReason().get().knownEnum();
            ModelFinishReason mappedFinish;
            switch (candidate.finishReason().get().knownEnum()) {
                case STOP:
                    mappedFinish = ModelFinishReason.FINAL;
                    break;

                case MAX_TOKENS:
                    // This is user-controllable (too long input/output)
                    mappedFinish = ModelFinishReason.INPUT_ERROR;
                    break;

                case BLOCKLIST:
                case PROHIBITED_CONTENT:
                case SPII:
                case IMAGE_SAFETY:
                case MALFORMED_FUNCTION_CALL:
                case UNEXPECTED_TOOL_CALL:
                    // Model messed up tool invocation
                    mappedFinish = ModelFinishReason.OUTPUT_ERROR;
                    break;

                case SAFETY:
                case RECITATION:
                case LANGUAGE:
                case FINISH_REASON_UNSPECIFIED:
                    // Default → treat as FINAL but ambiguous
                    mappedFinish = ModelFinishReason.FINAL;
                    break;

                case OTHER:
                default:
                    mappedFinish = ModelFinishReason.UNKNOWN;
                    break;
            }


            // Now parse parts: collect all texts and all functionCalls
            Optional<com.google.genai.types.Content> contentOpt = candidate.content();
            StringBuilder allTextSB = new StringBuilder();
            List<FunctionCallData> functionCalls = new ArrayList<>();

            if (contentOpt.isPresent()) {
                var content = contentOpt.get();
                List<Part> parts = content.parts().orElse(List.of());

                for (Part part : parts) {
                    part.text().ifPresent(t -> allTextSB.append(t));
                    if (part.functionCall().isPresent()) {
                        var fc = part.functionCall().get();
                        String fname = fc.name().orElse(null);
                        Object fargs = fc.args().orElse(null);
                        if (fname != null) {
                            functionCalls.add(new FunctionCallData(fname, fargs));
                        }
                    }
                }
            }

            String assistantText = !allTextSB.isEmpty() ? allTextSB.toString() : null;

            // decide finalAnswer: if no function calls, then treat assistantText as final
            Optional<String> finalAnswerOpt = Optional.empty();
            if (functionCalls.isEmpty()) {
                if (assistantText != null) {
                    finalAnswerOpt = Optional.of(assistantText);
                }
            }

            return new SendMessageResult(
                    mappedFinish,
                    Optional.ofNullable(assistantText),
                    functionCalls,
                    finalAnswerOpt,
                    Optional.empty()
            );

        } catch (IllegalArgumentException iae) {
            // input error e.g. malformed request, parameters wrong
            return new SendMessageResult(
                    ModelFinishReason.INPUT_ERROR,
                    Optional.empty(),
                    List.of(),
                    Optional.empty(),
                    Optional.of("Input error: " + iae.getMessage())
            );
        } catch (Exception e) {
            // other errors => probably output side
            return new SendMessageResult(
                    ModelFinishReason.OUTPUT_ERROR,
                    Optional.empty(),
                    List.of(),
                    Optional.empty(),
                    Optional.of("Exception when calling Gemini: " + e.getMessage())
            );
        }
    }

    @Override
    public Map<String, Object> sendMessage(List<Content> contents, List<Tool> tools) {
        SendMessageResult res = sendMessageNew(contents, tools);
        return res.toMap();
    }
}
