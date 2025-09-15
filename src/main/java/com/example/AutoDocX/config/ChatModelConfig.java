package com.example.AutoDocX.config;

import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.vertexai.VertexAiEmbeddingModel;
import dev.langchain4j.model.vertexai.gemini.VertexAiGeminiChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ChatModelConfig {

    private static final String PROJECT_ID = "codenection-470214";
    private static final String CHAT_MODEL = "gemini-2.5-flash";
    private static final String EMBEDDING_MODEL = "text-embedding-004";
    private static final String LOCATION = "us-central1";

    @Value("${google.api.key}")
    private String apiKey;

    @Bean
    public ChatModel geminiChatModel() {
        return VertexAiGeminiChatModel.builder()
                .project(PROJECT_ID)
                .location(LOCATION)
                .modelName(CHAT_MODEL)
                .logRequests(true)
                .logResponses(true)
                .seed(1234)
                .maxRetries(2)
                .build();
    }

    @Bean
    public EmbeddingModel vertexAiEmbeddingModel() {
        return VertexAiEmbeddingModel.builder()
                .project(PROJECT_ID)
                .location(LOCATION)
                .modelName(EMBEDDING_MODEL)
                .build();
    }
}
