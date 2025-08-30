package com.example.AutoDocX.controller;

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
import com.example.AutoDocX.service.JavaTreeConverter;
import com.example.AutoDocX.parser.model.JavaClass;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.List;

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

    @Autowired
    private JavaTreeConverter javaTreeConverter;

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

            Path repoPath = clonedRepo.getClonedPath();

            List<JavaClass> javaTree = javaTreeConverter.convertRepoToJavaTree(repoPath);
            StringBuilder treeString = new StringBuilder();
            javaTree.forEach(treeString::append);

            logger.info("Successfully parsed Java tree from repository: {}", repoPath);
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(treeString.toString());

        } catch (IOException e) {
            logger.error("File operation error after cloning URL: {}. Error: {}", url, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("File operation error: " + e.getMessage());
        }
    }
}
