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

import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.parser.model.JavaClass;
import java.util.List;
import com.example.AutoDocX.parser.model.GraphNode;
import java.util.Optional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import com.example.AutoDocX.repository.record.RepoRecord;
import java.util.stream.Collectors;

@Service
public class RepoHandler {

    private static final Logger logger = LoggerFactory.getLogger(RepoHandler.class);
    private static final int MAX_ENTRIES = 5; // Example capacity
    private static final Path JSON_FILE_PATH = Paths.get("cloned-repos/meta.json");

    @Autowired
    private GitService gitService;

    @Autowired
    private JavaTreeConverter javaTreeConverter;

    @Autowired
    private JavaGraphConverter javaGraphConverter;

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

    public RepoHandler() {
        loadReposFromJson();
    }

    private void saveReposToJson() {
        List<RepoRecord> repoRecords = cache.values().stream()
                .map(repo -> new RepoRecord(repo.getRepoLink(), repo.getClonedPath().toString(), repo.getBranch()))
                .collect(Collectors.toList());
        ObjectMapper mapper = new ObjectMapper();
        try {
            mapper.writerWithDefaultPrettyPrinter().writeValue(JSON_FILE_PATH.toFile(), repoRecords);
            logger.info("Cloned repositories saved to {}.", JSON_FILE_PATH);
        } catch (IOException e) {
            logger.error("Error saving cloned repositories to JSON: {}", e.getMessage(), e);
        }
    }

    private void loadReposFromJson() {
        ObjectMapper mapper = new ObjectMapper();
        if (Files.exists(JSON_FILE_PATH)) {
            try {
                List<RepoRecord> repoRecords = mapper.readValue(JSON_FILE_PATH.toFile(), new TypeReference<List<RepoRecord>>() {});
                for (RepoRecord record : repoRecords) {
                    // Check if the directory still exists
                    Path clonedPath = Paths.get(record.getClonedPath());
                    if (Files.exists(clonedPath) && Files.isDirectory(clonedPath)) {
                        // Reconstruct ClonedRepo object, graph will be null initially
                        ClonedRepo clonedRepo = new ClonedRepo(record.getRepoLink(), record.getBranch(), clonedPath, null, null); // Commit hash and graph are not persisted for simplicity here
                        String cacheKey = record.getRepoLink() + (record.getBranch() == null ? "" : "#" + record.getBranch());
                        cache.put(cacheKey, clonedRepo);
                    } else {
                        logger.warn("Cloned directory for {} not found at {}. Skipping.", record.getRepoLink(), record.getClonedPath());
                    }
                }
                logger.info("Cloned repositories loaded from {}.", JSON_FILE_PATH);
            } catch (IOException e) {
                logger.error("Error loading cloned repositories from JSON: {}", e.getMessage(), e);
            }
        }
    }

    public ClonedRepo getRepo(String repoLink) {
        return getRepo(repoLink, null);
    }

    public ClonedRepo getRepo(String repoLink, String branch) {
        String cacheKey = repoLink + (branch == null ? "" : "#" + branch);
        ClonedRepo clonedRepo = cache.get(cacheKey);
        if (clonedRepo != null) {
            logger.info("Retrieved repository from cache: {}. Checking for updates.", cacheKey);
            try {
                String oldCommitHash = clonedRepo.getCommitHash();
                String latestCommitHash = gitService.pullRepo(clonedRepo.getClonedPath());

                if (oldCommitHash == null || !oldCommitHash.equals(latestCommitHash)) {
                    clonedRepo.setCommitHash(latestCommitHash);
                    clonedRepo.setGraph(null);
                    logger.info("Repository updated to new commit: {}. Graph invalidated.", latestCommitHash);
                } else {
                    logger.info("Repository is already up-to-date.");
                }
            } catch (GitAPIException | IOException e) {
                logger.error("Failed to pull latest changes for repository {}: {}", cacheKey, e.getMessage(), e);
                // Optionally, decide if you want to return the stale repo or handle the error differently
            }
            return clonedRepo;
        } else {
            logger.info("Repository not found in cache, attempting to clone: {}", cacheKey);
            try {
                Path targetDir = Paths.get("cloned-repos", UUID.randomUUID().toString());
                String commitHash = gitService.cloneRepo(repoLink, branch, targetDir);
                clonedRepo = new ClonedRepo(repoLink, branch, targetDir, commitHash, null);
                cache.put(cacheKey, clonedRepo);
                saveReposToJson(); // Persist after new repo is cloned
                logger.info("Cloned and added repository to cache: {}", cacheKey);
                return clonedRepo;
            } catch (GitAPIException e) {
                logger.error("Failed to clone repository {}: {}", cacheKey, e.getMessage(), e);
                return null; // Or throw a custom exception
            }
        }
    }

    public String getCommit(String repoLink, String branch, String commitHash) throws IOException, GitAPIException {
        ClonedRepo repo = getRepo(repoLink, branch);
        if (repo == null) {
            return "Repository not found for " + repoLink + (branch == null ? "" : "#" + branch);
        }
        return gitService.getCommitDetails(repo.getClonedPath(), commitHash);
    }

    public String getCommitHistory(String repoLink, String branch) throws IOException, GitAPIException {
        ClonedRepo repo = getRepo(repoLink, branch);
        if (repo == null) {
            return "Repository not found for " + repoLink + (branch == null ? "" : "#" + branch);
        }
        return gitService.getCommitHistory(repo.getClonedPath());
    }

    public List<String> getModifiedFilesInCommit(String repoLink, String branch, String commitHash) throws IOException, GitAPIException {
        ClonedRepo repo = getRepo(repoLink, branch);
        if (repo == null) {
            throw new IOException("Repository not found for " + repoLink + (branch == null ? "" : "#" + branch));
        }
        return gitService.getModifiedFilesInCommit(repo.getClonedPath(), commitHash);
    }

    public Graph getGraph(ClonedRepo clonedRepo) throws IOException {
        if (clonedRepo.getGraph() == null) {
            logger.info("Generating graph for repository: {} | {}", clonedRepo.getRepoLink(), clonedRepo.getClonedPath());
            List<JavaClass> javaTree = javaTreeConverter.convertRepoToJavaTree(clonedRepo.getClonedPath());
            Graph graph = javaGraphConverter.convertJavaTreeToGraph(javaTree);
            clonedRepo.setGraph(graph);
        }
        return clonedRepo.getGraph();
    }

    public Graph getGraph(Session session) throws IOException {
        return getGraph(getRepo(session.getGitUrl(), session.getBranch()));
    }

    public Optional<String> getCodeChunkSafe(ClonedRepo clonedRepo, String nodeId) {
        try {
            return Optional.of(getCodeChunk(clonedRepo, nodeId));
        } catch (IOException | NodeNotFoundException e) {
            return Optional.empty();
        }
    }

    public String getCodeChunk(ClonedRepo clonedRepo, String nodeId) throws IOException, NodeNotFoundException {
        Graph graph = getGraph(clonedRepo);
        Optional<GraphNode> nodeOpt = graph.getNode(nodeId);

        if (nodeOpt.isEmpty()) {
            throw new NodeNotFoundException("Node with ID " + nodeId + " not found in the graph for repository " + clonedRepo.getRepoLink());
        }

        GraphNode node = nodeOpt.get();
        if (node.getFilePath() == null || node.getStartLine() == -1 || node.getEndLine() == -1) {
            throw new IllegalStateException("Code location information missing for node with ID: " + nodeId);
        }

        return gitService.readFileContent(node.getFilePath(), node.getStartLine(), node.getEndLine());
    }

    public void removeRepo(String repoLink) {
        ClonedRepo removedRepo = cache.remove(repoLink);
        if (removedRepo != null) {
            logger.info("Removed repository from cache: {}", repoLink);
            deleteClonedDirectory(removedRepo.getClonedPath());
            saveReposToJson(); // Persist after removing a repo
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

    // Custom exception for when a node is not found
    public static class NodeNotFoundException extends Exception {
        public NodeNotFoundException(String message) {
            super(message);
        }
    }
}
