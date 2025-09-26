package com.example.AutoDocX.model.repo;

import java.util.Map;
import com.google.genai.types.Content;
import com.google.genai.types.Tool;
import java.util.List;
import java.util.AbstractMap;
import java.util.concurrent.CompletableFuture;

public interface Model {
    @Deprecated
    Map<String, Object> sendMessageOld(List<Content> contents, List<Tool> tools);
    SendMessageResult sendMessage(List<Content> contents, List<Tool> tools);

    List<SendMessageResult> sendMessageBulk(
            List<AbstractMap.SimpleEntry<List<Content>, List<Tool>>> requests
    );

    CompletableFuture<List<SendMessageResult>> sendMessageBulkAsync(
            List<AbstractMap.SimpleEntry<List<Content>, List<Tool>>> requests
    );

    List<Map<String, Object>> sendMessageBulkAsMap(
            List<AbstractMap.SimpleEntry<List<Content>, List<Tool>>> requests
    );
}
