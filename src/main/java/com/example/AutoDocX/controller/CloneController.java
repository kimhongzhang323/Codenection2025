package com.example.AutoDocX.controller;

import com.example.AutoDocX.parser.model.GraphAlgo;
import com.example.AutoDocX.service.GitService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.service.RepoHandler;
import com.example.AutoDocX.service.RepoHandler.NodeNotFoundException;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.parser.model.GraphNode;
import com.example.AutoDocX.parser.model.JavaClass;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import org.eclipse.jgit.api.errors.GitAPIException;

@RestController
@RequestMapping("/api")
public class CloneController {
    private static final Logger logger = LoggerFactory.getLogger(CloneController.class);

    // GitService is no longer directly autowired here; RepoHandler handles cloning.

    @Autowired
    private RepoHandler repoHandler;

    // GitService is still needed for findFirstFile and readFileContent
    @Autowired
    private GitService gitService;


    @PostMapping("/clone")
    public ResponseEntity<String> cloneAndRead(@RequestBody Map<String, String> payload) {
        logger.info("Received clone request.");
        String url = payload.get("githubUrl");
        if (url == null || url.isBlank()) {
            logger.warn("Missing 'githubUrl' in clone request.");
            return ResponseEntity.badRequest().body("Missing 'githubUrl'");
        }

        try {
            ClonedRepo clonedRepo = repoHandler.getRepo(url);
            if (clonedRepo == null) {
                logger.error("Failed to get or clone repository: {}", url);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Failed to get or clone repository.");
            }

            Graph graph = repoHandler.getGraph(clonedRepo);

            String bfsResult = "No classes found to perform BFS.";
            // For testing, we need to get a class from the graph to start BFS.
            // This assumes at least one class exists.
            if (!graph.getNodes().isEmpty() && graph.getNodes().get(0).getType() == GraphNode.NodeType.CLASS) {
                String startNodeId = graph.getNodes().get(0).getId(); // Using the first class node as start
                bfsResult = GraphAlgo.bfs(graph, startNodeId, 2);
            }

            String responseBody = graph.toString() + "\n\n" + bfsResult;

            logger.info("Successfully parsed Java tree, converted to graph, and performed BFS from repository: {}", clonedRepo.getRepoLink());
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(responseBody);

        } catch (IOException e) {
            logger.error("Error during repository processing for URL: {}. Error: {}", url, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error processing repository: " + e.getMessage());
        }
    }

    @PostMapping("/code")
    public ResponseEntity<String> getCodeChunk(@RequestBody Map<String, String> payload) {
        String repoUrl = payload.get("githubUrl");
        String nodeId = payload.get("nodeId");

        if (repoUrl == null || repoUrl.isBlank()) {
            return ResponseEntity.badRequest().body("Missing 'githubUrl'");
        }
        if (nodeId == null || nodeId.isBlank()) {
            return ResponseEntity.badRequest().body("Missing 'nodeId'");
        }

        try {
            ClonedRepo clonedRepo = repoHandler.getRepo(repoUrl);
            if (clonedRepo == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to get or clone repository.");
            }

            String codeChunk = repoHandler.getCodeChunk(clonedRepo, nodeId);
            return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(codeChunk);
        } catch (NodeNotFoundException e) {
            logger.warn("Node not found: {}. Repo: {}", nodeId, repoUrl);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IOException e) {
            logger.error("IO error retrieving code chunk for node {}: {}", nodeId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving code chunk: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error retrieving code chunk for node {}: {}", nodeId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An unexpected error occurred: " + e.getMessage());
        }
    }
}
