package com.example.AutoDocX.model.repo;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;
import com.google.genai.types.GenerateContentResponseUsageMetadata;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service("geminiModel")
public class GeminiModel implements Model {
    private final Client genaiClient;
    private final String modelName;
    private final ExecutorService executor;

    public GeminiModel(
            @Value("${gemini.model.name}") String modelName,
            @Value("${gemini.api.key}") String apiKey
    ) {
        this.genaiClient = Client.builder().apiKey(apiKey).build();
        this.modelName = modelName;
        this.executor = Executors.newFixedThreadPool(
                Runtime.getRuntime().availableProcessors()
        );
    }

    @Override
    public Map<String, Object> sendMessage(List<Content> contents, List<Tool> tools) {
        SendMessageResult res = sendMessageNew(contents, tools);
        return res.toMap();
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

            if (response.candidates().isEmpty() || response.candidates().get().isEmpty()) {
                return new SendMessageResult(
                        ModelFinishReason.OUTPUT_ERROR,
                        Optional.empty(),
                        List.of(),
                        Optional.of("No response from Gemini model."),
                        0
                );
            }

            var candidate = response.candidates().get().get(0);
            ModelFinishReason mappedFinish = mapFinishReason(candidate);
            ParsedCandidate parsed = parseCandidate(candidate);
            int totalTokens = response.usageMetadata().map(GenerateContentResponseUsageMetadata::totalTokenCount).map(Optional::get).orElse(0);

            return new SendMessageResult(
                    mappedFinish,
                    Optional.ofNullable(parsed.assistantText),
                    parsed.functionCalls,
                    Optional.empty(),
                    totalTokens
            );

        } catch (IllegalArgumentException iae) {
            return new SendMessageResult(
                    ModelFinishReason.INPUT_ERROR,
                    Optional.empty(),
                    List.of(),
                    Optional.of("Input error: " + iae.getMessage()),
                    0
            );
        } catch (Exception e) {
            return new SendMessageResult(
                    ModelFinishReason.OUTPUT_ERROR,
                    Optional.empty(),
                    List.of(),
                    Optional.of("Exception when calling Gemini: " + e.getMessage()),
                    0
            );
        }
    }

    private ModelFinishReason mapFinishReason(com.google.genai.types.Candidate candidate) {
        if (candidate.finishReason().isEmpty())
            return ModelFinishReason.OUTPUT_ERROR;

        switch (candidate.finishReason().get().knownEnum()) {
            case STOP:
                return ModelFinishReason.FINAL;
            case MAX_TOKENS:
                return ModelFinishReason.INPUT_ERROR;
            case BLOCKLIST:
            case PROHIBITED_CONTENT:
            case SPII:
            case IMAGE_SAFETY:
            case MALFORMED_FUNCTION_CALL:
            case UNEXPECTED_TOOL_CALL:
                return ModelFinishReason.OUTPUT_ERROR;
            case SAFETY:
            case RECITATION:
            case LANGUAGE:
            case FINISH_REASON_UNSPECIFIED:
                return ModelFinishReason.FINAL;
            case OTHER:
            default:
                return ModelFinishReason.UNKNOWN;
        }
    }

    private ParsedCandidate parseCandidate(com.google.genai.types.Candidate candidate) {
        Optional<com.google.genai.types.Content> contentOpt = candidate.content();
        StringBuilder allTextSB = new StringBuilder();
        List<ToolCallData> functionCalls = new ArrayList<>();

        if (contentOpt.isPresent()) {
            var content = contentOpt.get();
            List<Part> parts = content.parts().orElse(List.of());

            for (Part part : parts) {
                part.text().ifPresent(allTextSB::append);
                part.functionCall().ifPresent(fc -> {
                    String fname = fc.name().orElse(null);
                    Map<String, Object> fargs = fc.args().orElse(null);
                    if (fname != null) {
                        functionCalls.add(new ToolCallData(fname, fargs));
                    }
                });
            }
        }

        String assistantText = !allTextSB.isEmpty() ? allTextSB.toString() : null;
        return new ParsedCandidate(assistantText, functionCalls);
    }


    // --- Factory method ---
    public static AbstractMap.SimpleEntry<List<Content>, List<Tool>> createArgs(
            List<Content> contents, List<Tool> tools
    ) {
        return new AbstractMap.SimpleEntry<>(contents, tools);
    }

    // --- Bulk blocking version ---
    public List<SendMessageResult> sendMessageBulk(
            List<AbstractMap.SimpleEntry<List<Content>, List<Tool>>> requests
    ) {
        List<CompletableFuture<SendMessageResult>> futures = requests.stream()
                .map(req -> CompletableFuture.supplyAsync(
                        () -> sendMessageNew(req.getKey(), req.getValue()), executor
                ))
                .toList();

        return futures.stream()
                .map(CompletableFuture::join)
                .toList();
    }

    // --- Bulk async version ---
    public CompletableFuture<List<SendMessageResult>> sendMessageBulkAsync(
            List<AbstractMap.SimpleEntry<List<Content>, List<Tool>>> requests
    ) {
        List<CompletableFuture<SendMessageResult>> futures = requests.stream()
                .map(req -> CompletableFuture.supplyAsync(
                        () -> sendMessageNew(req.getKey(), req.getValue()), executor
                ))
                .toList();

        // Combine into a single CompletableFuture<List<SendMessageResult>>
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenApply(v -> futures.stream()
                        .map(CompletableFuture::join)
                        .toList()
                );
    }

    // --- Convenience map-returning version ---
    public List<Map<String, Object>> sendMessageBulkAsMap(
            List<AbstractMap.SimpleEntry<List<Content>, List<Tool>>> requests
    ) {
        return sendMessageBulk(requests).stream()
                .map(SendMessageResult::toMap)
                .toList();
    }
}

class ParsedCandidate {
    final String assistantText;
    final List<ToolCallData> functionCalls;

    ParsedCandidate(String assistantText, List<ToolCallData> functionCalls) {
        this.assistantText = assistantText;
        this.functionCalls = functionCalls;
    }
}