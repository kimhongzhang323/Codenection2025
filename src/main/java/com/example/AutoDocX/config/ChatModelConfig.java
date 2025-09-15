package com.example.AutoDocX.config;

import dev.langchain4j.data.message.Content;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class ChatModelConfig {
    private Content input;

    @Value("${google.api.key}")
    private String apiKey;

    @Bean
    public ChatModel geminiChatModel() {
        return GoogleAiGeminiChatModel.builder()
                .apiKey(apiKey)
                .modelName("gemini-2.5-flash")
                .temperature(1.0)
                .topP(0.95)
                .topK(64)
                .seed(42)
                .maxOutputTokens(8192)
                .timeout(Duration.ofSeconds(60))
                .build();
    }

}
