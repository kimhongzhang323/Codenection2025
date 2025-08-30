package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Comparator;
import java.util.stream.Stream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.UUID;
import org.eclipse.jgit.api.errors.GitAPIException;

@Service
public class RepoHandler {

    private static final Logger logger = LoggerFactory.getLogger(RepoHandler.class);
    private static final int MAX_ENTRIES = 5; // Example capacity

    @Autowired
    private GitService gitService;

    private final LinkedHashMap<String, ClonedRepo> cache = new LinkedHashMap<String, ClonedRepo>(MAX_ENTRIES, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, ClonedRepo> eldest) {
            if (size() > MAX_ENTRIES) {
                logger.info("Evicting least recently used repository: {}", eldest.getKey());
                deleteClonedDirectory(eldest.getValue().getClonedPath());
                return true;
            }
            return false;
        }
    };

    public ClonedRepo getRepo(String repoLink) {
        ClonedRepo clonedRepo = cache.get(repoLink);
        if (clonedRepo != null) {
            logger.info("Retrieved repository from cache: {}", repoLink);
            return clonedRepo;
        } else {
            logger.info("Repository not found in cache, attempting to clone: {}", repoLink);
            try {
                Path targetDir = Paths.get("cloned-repos", UUID.randomUUID().toString());
                String commitHash = gitService.cloneRepo(repoLink, targetDir);
                clonedRepo = new ClonedRepo(repoLink, targetDir, commitHash);
                cache.put(repoLink, clonedRepo);
                logger.info("Cloned and added repository to cache: {}", repoLink);
                return clonedRepo;
            } catch (GitAPIException e) {
                logger.error("Failed to clone repository {}: {}", repoLink, e.getMessage(), e);
                return null; // Or throw a custom exception
            }
        }
    }

    public void removeRepo(String repoLink) {
        ClonedRepo removedRepo = cache.remove(repoLink);
        if (removedRepo != null) {
            logger.info("Removed repository from cache: {}", repoLink);
            deleteClonedDirectory(removedRepo.getClonedPath());
        } else {
            logger.warn("Attempted to remove non-existent repository from cache: {}", repoLink);
        }
    }

    public int size() {
        return cache.size();
    }

    private void deleteClonedDirectory(Path path) {
        if (Files.exists(path)) {
            try (Stream<Path> pathStream = Files.walk(path)) {
                pathStream.sorted(Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(java.io.File::delete);
                logger.info("Deleted cloned repository directory: {}", path);
            } catch (IOException e) {
                logger.error("Error deleting directory {}: {}", path, e.getMessage(), e);
            }
        }
    }
}
