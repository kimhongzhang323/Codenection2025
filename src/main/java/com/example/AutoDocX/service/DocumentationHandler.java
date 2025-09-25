package com.example.AutoDocX.service;

import com.example.AutoDocX.model.Documentation;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DocumentationHandler {

    private final Path documentationDir = Paths.get("documentations");
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Documentation> documentationMap = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        try {
            if (!Files.exists(documentationDir)) {
                Files.createDirectories(documentationDir);
            }
            loadAll();
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize documentation directory", e);
        }
    }

    private void loadAll() throws IOException {
        File[] files = documentationDir.toFile().listFiles((dir, name) -> name.endsWith(".json"));
        if (files == null) return;

        for (File file : files) {
            try {
                Documentation doc = objectMapper.readValue(file, Documentation.class);
                String key = file.getName().replace(".json", "");
                documentationMap.put(key, doc);
            } catch (IOException e) {
                System.err.println("Failed to load documentation: " + file.getName());
            }
        }
    }

    public Documentation get(String key) {
        return documentationMap.get(key);
    }

    public Map<String, Documentation> getAll() {
        return new ConcurrentHashMap<>(documentationMap);
    }

    public void save(String key, Documentation doc) {
        documentationMap.put(key, doc);
        try {
            Path filePath = documentationDir.resolve(key + ".json");
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(filePath.toFile(), doc);
        } catch (IOException e) {
            System.err.println("Failed to save documentation: " + key);
        }
    }

    public void delete(String key) {
        documentationMap.remove(key);
        try {
            Path filePath = documentationDir.resolve(key + ".json");
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            System.err.println("Failed to delete documentation file: " + key);
        }
    }

    public void clear() {
        documentationMap.clear();
        try {
            Files.walk(documentationDir)
                    .filter(Files::isRegularFile)
                    .map(Path::toFile)
                    .forEach(File::delete);
        } catch (IOException e) {
            System.err.println("Failed to clear documentation directory.");
        }
    }
}
