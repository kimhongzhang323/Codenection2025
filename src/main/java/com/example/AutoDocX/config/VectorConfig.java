package com.example.AutoDocX.config;

import io.pinecone.clients.Pinecone;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class VectorConfig {

    private static final Logger logger = LoggerFactory.getLogger(VectorConfig.class);

    @Value("${pinecone.api.key}")
    private String pineconeApiKey;

    @Value("${pinecone.environment}")
    private String environment;

    @Bean
    @Primary
    public Pinecone pineconeClient() {
        logger.info("Initializing Pinecone Data client with environment: {}", environment);
        return new Pinecone.Builder(pineconeApiKey).build();
    }

    @Bean
    public Pinecone pineconeControlClient() {
        logger.info("Initializing Pinecone Control client...");
        return new Pinecone.Builder(pineconeApiKey)
                .build();
    }
}
