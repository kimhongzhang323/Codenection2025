package com.example.AutoDocX.model.repo;

import com.google.genai.types.Content;
import com.google.genai.types.Tool;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.PreDestroy;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

@Service("geminiCentral")
public class GeminiCentral implements Model {

    private static final Logger logger = LoggerFactory.getLogger(GeminiCentral.class);

    private final List<String> apiKeys;
    private final int maxKeysPerRequest;
    private final Map<String, AtomicLong> tokenUsage = new ConcurrentHashMap<>();
    private final Map<String, GeminiModel> geminiModels = new ConcurrentHashMap<>();
    private final ExecutorService executor;


    public GeminiCentral(
            @Value("${gemini.api.keyList}") List<String> apiKeys,
            @Value("${gemini.model.name}") String modelName,
            @Value("${gemini.maxKeysPerRequest:2}") int maxKeysPerRequest
    ) {
        this.apiKeys = apiKeys;
        this.maxKeysPerRequest = Math.max(1, Math.min(maxKeysPerRequest, apiKeys.size()));
        this.executor = Executors.newFixedThreadPool(
                Math.max(Runtime.getRuntime().availableProcessors(), apiKeys.size())
        );
        for (String key : apiKeys) {
            tokenUsage.put(key, new AtomicLong(0));
            geminiModels.put(key, new GeminiModel(modelName, key));
        }
    }

    private String getLeastUsedApiKey() {
        return tokenUsage.entrySet().stream()
                .min(Map.Entry.comparingByValue(Comparator.comparing(AtomicLong::get)))
                .map(Map.Entry::getKey)
                .orElse(apiKeys.get(0));
    }

    @Override
    public Map<String, Object> sendMessage(List<Content> contents, List<Tool> tools) {
        SendMessageResult result = sendMessageNew(contents, tools);
        return result.toMap();
    }

    private static final long FAILURE_PENALTY = 1_000_000L; // 1 million tokens

    @Override
    public SendMessageResult sendMessageNew(List<Content> contents, List<Tool> tools) {
        int maxRetries = Math.min(apiKeys.size(), maxKeysPerRequest);
        for (int i = 0; i < maxRetries; i++) {
            String apiKey = getLeastUsedApiKey();
            int apiKeyIndex = apiKeys.indexOf(apiKey);
            GeminiModel model = geminiModels.get(apiKey);
            SendMessageResult result = model.sendMessageNew(contents, tools);

            if (result.getModelFinishReason() != ModelFinishReason.OUTPUT_ERROR &&
                    !result.getErrorMessage().map(m -> m.contains("token exceeded")).orElse(false)) {
                long tokens = result.getTotalTokens();
                tokenUsage.get(apiKey).addAndGet(tokens);
                logger.info("GeminiModel[{}]: api:{}...: tokens: {}", apiKeyIndex, apiKey.substring(0, 10), tokens);
                return result;
            } else {
                // Penalize the failing key to take it out of rotation for a while.
                tokenUsage.get(apiKey).addAndGet(FAILURE_PENALTY);
                String err = result.getErrorMessage().orElse("unknown");
                logger.warn("GeminiModel[{}]: api:{}...: FAIL reason={} finishReason={}", apiKeyIndex, apiKey.substring(0, 10), err, result.getModelFinishReason());
                // Early stop on obvious auth/quota errors to avoid burning through keys
                if (err.toLowerCase().contains("api key") || err.toLowerCase().contains("permission") || err.toLowerCase().contains("quota") || err.toLowerCase().contains("unauthorized")) {
                    break;
                }
            }
        }
        return new SendMessageResult(
                ModelFinishReason.OUTPUT_ERROR,
                Optional.empty(),
                List.of(),
                java.util.Optional.of("All API keys failed."),
                0
        );
    }

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

    public CompletableFuture<List<SendMessageResult>> sendMessageBulkAsync(
            List<AbstractMap.SimpleEntry<List<Content>, List<Tool>>> requests
    ) {
        List<CompletableFuture<SendMessageResult>> futures = requests.stream()
                .map(req -> CompletableFuture.supplyAsync(
                        () -> sendMessageNew(req.getKey(), req.getValue()), executor
                ))
                .toList();

        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenApply(v -> futures.stream()
                        .map(CompletableFuture::join)
                        .toList()
                );
    }

    public List<Map<String, Object>> sendMessageBulkAsMap(
            List<AbstractMap.SimpleEntry<List<Content>, List<Tool>>> requests
    ) {
        return sendMessageBulk(requests).stream()
                .map(SendMessageResult::toMap)
                .toList();
    }

    @PreDestroy
    public void cleanup() {
        if (executor != null && !executor.isShutdown()) {
            executor.shutdown();
            try {
                if (!executor.awaitTermination(60, java.util.concurrent.TimeUnit.SECONDS)) {
                    executor.shutdownNow();
                }
            } catch (InterruptedException e) {
                executor.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }
}
