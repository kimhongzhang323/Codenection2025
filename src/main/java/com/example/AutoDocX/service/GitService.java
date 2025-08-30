package com.example.AutoDocX.service;

import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.Optional;
import java.util.stream.Stream;

@Service
public class GitService {

    /**
     * Clones a GitHub repository to the target directory.
     *
     * @param repoUrl   GitHub repo URL
     * @param targetDir Path where repo will be cloned
     * @return Path to cloned repository root
     * @throws GitAPIException if cloning fails
     */
    public String cloneRepo(String repoUrl, Path targetDir) throws GitAPIException {
        try (Git git = Git.cloneRepository()
                .setURI(repoUrl)
                .setDirectory(targetDir.toFile())
                .call()) {
            return git.getRepository().findRef("HEAD").getObjectId().getName();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Finds the first regular file in the repository (sorted alphabetically).
     */
    public Optional<Path> findFirstFile(Path rootDir) throws IOException {
        try (Stream<Path> stream = Files.walk(rootDir)) {
            return stream
                    .filter(Files::isRegularFile)
                    .sorted()
                    .findFirst();
        }
    }

    /**
     * Reads the content of a file.
     */
    public String readFileContent(Path filePath) throws IOException {
        return Files.readString(filePath);
    }
}
