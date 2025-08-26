package com.example.AutoDocX.model;

import com.example.AutoDocX.model.repo.Model;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Service
public class ModelImpl implements Model {

    private final ChatModel chatModel;
    private final Executor aiTaskExecutor;
    private static final Logger log = LoggerFactory.getLogger(ModelImpl.class);

    public ModelImpl(ChatModel chatModel, @Qualifier("aiTaskExecutor") Executor aiTaskExecutor) {
        this.chatModel = chatModel;
        this.aiTaskExecutor = aiTaskExecutor;
        log.info("ModelImpl initialized with ChatModel and ThreadPool.");
    }

    @Override
    public String sendMessage(String message) {
        try {
            // Submit AI call to thread pool and wait for result
            return CompletableFuture.supplyAsync(() -> {
                try {
                    return chatModel.call(message);
                } catch (Exception e) {
                    log.error("Error processing chat request: {}", e.getMessage(), e);
                    return "Sorry, an error occurred while communicating with the AI service.";
                }
            }, aiTaskExecutor).join();
        } catch (Exception e) {
            log.error("Unexpected error in async AI call: {}", e.getMessage(), e);
            return "Sorry, an unexpected error occurred.";
        }
    }
}
