package com.example.AutoDocX.service;

import com.example.AutoDocX.model.Documentation;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DocumentationHandler {

    private final Map<String, Documentation> documentationMap = new ConcurrentHashMap<>();

    public Documentation get(String key) {
        return documentationMap.get(key);
    }

    public Map<String, Documentation> getAll() {
        return new ConcurrentHashMap<>(documentationMap);
    }

    public void save(String key, Documentation doc) {
        documentationMap.put(key, doc);
    }

    public void delete(String key) {
        documentationMap.remove(key);
    }

    public void clear() {
        documentationMap.clear();
    }
}
