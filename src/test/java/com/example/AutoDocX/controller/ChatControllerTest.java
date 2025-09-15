package com.example.AutoDocX.controller;

import com.example.AutoDocX.service.ChatService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ChatController.class)
class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ChatService chatService;

    @Test
    void chat_shouldReturnResponseFromService() throws Exception {
        // given
        String mockAnswer = "Dependency Injection is a design pattern in Spring.";
        Mockito.when(chatService.sendMessage(anyString())).thenReturn(mockAnswer);

        // when & then
        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "user",
                                  "content": "What is dependency injection?"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().string(mockAnswer));
    }

    @Test
    void chat_shouldReturnErrorMessageOnException() throws Exception {
        // given
        Mockito.when(chatService.sendMessage(anyString()))
                .thenThrow(new RuntimeException("AI error"));

        // when & then
        mockMvc.perform(post("/api/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "user",
                                  "content": "This will fail"
                                }
                                """))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string("{\"error\": \"Sorry, an error occurred while communicating with the AI service.\"}"));
    }
}
