package com.example.AutoDocX.model.repo;

import java.util.Map;
import com.google.genai.types.Content;
import com.google.genai.types.Tool;
import java.util.List;

public interface Model {
    Map<String, Object> sendMessage(List<Content> contents, List<Tool> tools);
}
