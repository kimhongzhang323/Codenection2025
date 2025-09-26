package com.example.AutoDocX.service;

import com.example.AutoDocX.model.Documentation;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.eclipse.jgit.api.errors.GitAPIException;

public class DocumentationHandler {

    private static final Logger logger = LoggerFactory.getLogger(DocumentationHandler.class);
    private final Map<String, Documentation> documentationMap = new ConcurrentHashMap<>();
    @Getter
    private String defaultDocumentationKey;

    public void loadFromDirectory(Path repoRoot, GitService gitService) {
        if (repoRoot == null || !Files.isDirectory(repoRoot)) {
            logger.warn("Repository root is null or not a directory: {}", repoRoot);
            return;
        }
        try (Stream<Path> paths = Files.walk(repoRoot)) {
            paths.filter(path -> !path.toString().contains(".git")) // Ignore .git directory
                    .filter(path -> path.toString().toLowerCase().endsWith(".md"))
                    .forEach(path -> {
                        try {
                            String content = Files.readString(path);
                            String relativePath = repoRoot.relativize(path).toString();
                            Date lastModified = gitService.getFileLastModified(repoRoot, relativePath);
                            documentationMap.put(relativePath, new Documentation(content, lastModified));
                            logger.info("Loaded markdown file: {} (last modified: {})", relativePath, lastModified);
                        } catch (IOException | GitAPIException e) {
                            logger.error("Failed to read or get history for markdown file: {}", path, e);
                        }
                    });
        } catch (IOException e) {
            logger.error("Error walking repository file tree: {}", repoRoot, e);
        }
    }

    public String getSection(String key, String sectionPath) {
        Documentation doc = documentationMap.get(key);
        if (doc == null || doc.getContent() == null) {
            return null;
        }

        String[] pathParts = sectionPath.split("\\.");
        String content = doc.getContent();
        int currentLevel = 0;
        Pattern pattern = Pattern.compile("^(#+)\\s+(.*)");

        String[] lines = content.split("\\R");
        StringBuilder sectionContent = new StringBuilder();
        boolean inSection = false;

        for (String line : lines) {
            Matcher matcher = pattern.matcher(line);
            if (matcher.find()) {
                int level = matcher.group(1).length();
                String title = matcher.group(2).trim();

                if (inSection) {
                    if (level <= currentLevel) {
                        break; // Exited the target section
                    }
                } else if (level > currentLevel && title.equalsIgnoreCase(pathParts[currentLevel])) {
                    currentLevel++;
                    if (currentLevel == pathParts.length) {
                        inSection = true;
                    }
                }
            } else if (inSection) {
                sectionContent.append(line).append("\n");
            }
        }

        return inSection ? sectionContent.toString() : null;
    }

    public List<String> listSections(String key) {
        Documentation doc = documentationMap.get(key);
        if (doc == null || doc.getContent() == null) {
            return Collections.emptyList();
        }

        Pattern pattern = Pattern.compile("^(#+)\\s+(.*)");
        return doc.getContent().lines()
                .map(pattern::matcher)
                .filter(Matcher::matches)
//                .map(matcher -> "  ".repeat(matcher.group(1).length() - 1) + "- " + matcher.group(2).trim())
                .map(matcher -> matcher.group(2).trim())
                .collect(Collectors.toList());
    }

    public Documentation get(String key) {
        return documentationMap.get(key);
    }

    public Map<String, Documentation> getAll() {
        return new ConcurrentHashMap<>(documentationMap);
    }

    public void save(String key, Documentation doc) {
        documentationMap.put(key, doc);
    }

    public void setExpandedCounter(String key, int countdown) {
        Documentation doc = documentationMap.get(key);
        if (doc != null) {
            doc.setExpandedCounter(countdown);
        }
    }

    public void decrementAllExpandedCounters() {
        for (Documentation doc : documentationMap.values()) {
            doc.decrementExpandedCounter();
        }
    }

    public void delete(String key) {
        documentationMap.remove(key);
    }

    public void clear() {
        documentationMap.clear();
    }

    public boolean setDefaultDocumentationKey(String key) {
        if (documentationMap.containsKey(key)) {
            this.defaultDocumentationKey = key;
            return true;
        }
        return false;
    }

    public String toContextString() {
        StringBuilder sb = new StringBuilder();

        if (!documentationMap.isEmpty()) {
            sb.append("CURRENT_DOCUMENTATION:\n");
            for (Map.Entry<String, Documentation> entry : documentationMap.entrySet()) {
                if (entry.getValue().isExpanded()) {
                    sb.append("--- START DOC: ").append(entry.getKey()).append(" ---\n");
                    sb.append(entry.getValue().toString());
                    sb.append("\n--- END DOC: ").append(entry.getKey()).append(" ---\n\n");
                } else {
                    String key = entry.getKey();
                    Documentation doc = entry.getValue();
                    long lineCount = doc.getContent() != null ? doc.getContent().lines().count() : 0;
                    List<String> sections = listSections(key);
                    List<String> sectionPreview = sections.stream().limit(5).collect(Collectors.toList());

                    sb.append("- ").append(key).append(" ");
                    sb.append("(collapsed, ").append(lineCount).append(" Lines), ");
//                    sb.append("Sections Preview (top 5): ");
//                    if (sectionPreview.isEmpty()) {
//                        sb.append("No sections found");
//                    } else {
//                        sb.append(String.join(" | ", sectionPreview));
//                    }
                    sb.append("\n");
                }
            }
            sb.append("\n");
        }
        return sb.toString();
    }
}
