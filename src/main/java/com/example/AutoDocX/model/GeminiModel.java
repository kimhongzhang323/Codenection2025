package com.example.AutoDocX.model;

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
    public Map<String, Object> sendMessageOld(List<Content> contents, List<Tool> tools) {
        SendMessageResult res = sendMessage(contents, tools);
        return res.toMap();
    }

    // New version
    public SendMessageResult sendMessage(List<Content> contents, List<Tool> tools) {
        String rid = UUID.randomUUID().toString();
        try {
            var config = com.google.genai.types.GenerateContentConfig.builder()
                    .tools(tools)
                    .temperature(0.0f)
                    .build();

            // Pretty log request
            logRequest(rid, modelName, contents, tools);

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
            int totalTokens = response.usageMetadata()
                    .map(GenerateContentResponseUsageMetadata::totalTokenCount)
                    .map(Optional::get)
                    .orElse(0);

            // Pretty log response
            logResponse(rid, mappedFinish, totalTokens, parsed);

            return new SendMessageResult(
                    mappedFinish,
                    Optional.ofNullable(parsed.assistantText),
                    parsed.functionCalls,
                    Optional.empty(),
                    totalTokens
            );

        } catch (IllegalArgumentException iae) {
            logError(rid, "Input error: " + iae.getMessage());
            return new SendMessageResult(
                    ModelFinishReason.INPUT_ERROR,
                    Optional.empty(),
                    List.of(),
                    Optional.of("Input error: " + iae.getMessage()),
                    0
            );
        } catch (Exception e) {
            logError(rid, "Exception when calling Gemini: " + e.getMessage());
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
        if (candidate.finishReason().isEmpty()) {
            System.out.println("[mapFinishReason] finishReason is EMPTY → returning OUTPUT_ERROR");
            return ModelFinishReason.OUTPUT_ERROR;
        }

        var finishReason = candidate.finishReason().get();
        var knownEnum = finishReason.knownEnum();

        System.out.println("[mapFinishReason] raw finishReason: " + finishReason);
        System.out.println("[mapFinishReason] mapped enum: " + knownEnum);

        switch (knownEnum) {
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
                        () -> sendMessage(req.getKey(), req.getValue()), executor
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
                        () -> sendMessage(req.getKey(), req.getValue()), executor
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

    // --- Logging helpers (JSON-style pretty print) ---
    private void logRequest(String rid, String modelName, List<Content> contents, List<Tool> tools) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append("  requestId: \"").append(rid).append("\",\n");
        sb.append("  model: \"").append(modelName).append("\",\n");
        sb.append("  messages:\n");

        for (Content content : contents) {
            String role = content.role().orElse("NULL");
            sb.append("\t\t").append(role.toUpperCase()).append(":\t");

            if (content.parts().isPresent()) {
                List<Part> parts = content.parts().get();
                boolean first = true;
                for (Part part : parts) {
                    if (part.text().isPresent()) {
                        String[] lines = part.text().get().split("\n");
                        for (String line : lines) {
                            if (first) {
                                sb.append(line).append("\n");
                                first = false;
                            } else {
                                sb.append("\t\t\t\t").append(line).append("\n");
                            }
                        }
                    } else if (part.functionCall().isPresent()) {
                        sb.append("[FunctionCall: ")
                                .append(part.functionCall().get().name().orElse("UNKNOWN"))
                                .append("]\n");
                    }
                }
            }
        }

        sb.append("  tools: [\n");
        for (Tool t : tools) {
            t.functionDeclarations().ifPresent(decls -> decls.forEach(fd -> {
                sb.append("    ")
                        .append(fd.name().orElse("UNKNOWN_TOOL"))
                        .append("()\n");
            }));
        }
        sb.append("  ]\n");
        sb.append("}\n");

        System.out.println(sb);
    }


    private void logResponse(String rid, ModelFinishReason finish, int tokens, ParsedCandidate parsed) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append("  requestId: \"").append(rid).append("\",\n");
        sb.append("  finishReason: \"").append(finish).append("\",\n");
        sb.append("  tokens: ").append(tokens).append(",\n");

        if (parsed.assistantText != null && !parsed.assistantText.isEmpty()) {
            sb.append("  text: ").append(parsed.assistantText).append(",\n");
        }

        sb.append("  toolCalls: [\n");
        for (ToolCallData fc : parsed.functionCalls) {
            sb.append("    ")
                    .append(fc.getName())
                    .append(fc.getArgs())
                    .append("\n");
        }
        sb.append("  ]\n");
        sb.append("}\n");

        System.out.println(sb);
    }

    private void logError(String rid, String message) {
        System.out.println("{ error: \"" + message + "\", requestId: \"" + rid + "\" }");
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
