package com.example.AutoDocX.model;

import com.example.AutoDocX.model.repo.Model;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;

@Service
public class ModelImpl implements Model {
    private final ChatModel chatModel;
    private static final Logger log = LoggerFactory.getLogger(ModelImpl.class);

    public ModelImpl(ChatModel chatModel) {
        this.chatModel = chatModel;
        log.info("ModelImpl (instance) initialized with Spring AI ChatModel.");
    }

    @Override
    public String sendMessage(String message) {
        try {
            return this.chatModel.call(message);
        } catch (Exception e) {
            log.error("Error processing chat request via Spring AI: {}", e.getMessage(), e);
            return "Sorry, an error occurred while communicating with the AI service.";
        }
    }
}