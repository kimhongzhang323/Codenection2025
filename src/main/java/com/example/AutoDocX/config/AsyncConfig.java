package com.example.AutoDocX.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
public class AsyncConfig {

    @Bean(name = "aiTaskExecutor")
    public Executor aiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);        // Minimum threads
        executor.setMaxPoolSize(20);        // Maximum threads
        executor.setQueueCapacity(50);      // Queue size before spawning more threads
        executor.setThreadNamePrefix("AI-Executor-");
        executor.initialize();
        return executor;
    }
}
