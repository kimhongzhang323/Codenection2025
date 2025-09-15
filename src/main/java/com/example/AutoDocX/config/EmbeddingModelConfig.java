package com.example.AutoDocX.config;

import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.huggingface.HuggingFaceEmbeddingModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class EmbeddingModelConfig {
    private static final String MODEL_NAME = "microsoft/codebert-base";

    @Value("${hf.token}")
    private String HF_TOKEN;

    @Bean
    public EmbeddingModel codeBertEmbeddingModel() {
        return HuggingFaceEmbeddingModel.builder()
                .modelId(MODEL_NAME)
                .accessToken(HF_TOKEN)
                .waitForModel(true)
                .timeout(Duration.ofSeconds(60))
                .build();
    }
}
