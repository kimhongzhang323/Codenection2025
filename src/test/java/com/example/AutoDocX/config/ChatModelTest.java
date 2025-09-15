package com.example.AutoDocX.config;

import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ChatModelTest {

    @Autowired
    private ChatModel geminiChatModel;

    @Autowired
    private ChatModelConfig chatModelConfig;

    @Test
    void testAskMethod() {
        String question = "What is dependency injection in Spring Boot?";

        ChatResponse response = chatModelConfig.ask(geminiChatModel, question);

        assertThat(response).isNotNull();
        assertThat(response.aiMessage().text()).isNotBlank();

        System.out.println("AI Response: " + response.aiMessage().text());
    }
}
