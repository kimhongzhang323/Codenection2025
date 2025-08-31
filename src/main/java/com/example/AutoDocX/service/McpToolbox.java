package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import com.example.AutoDocX.parser.model.Graph;
import com.example.AutoDocX.parser.model.GraphNode;
import com.example.AutoDocX.service.RepoHandler.NodeNotFoundException;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.io.IOException;
import java.util.Collections;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.nio.file.FileVisitResult;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.AccessDeniedException;

@Service
public class McpToolbox {
    private final RepoHandler repoHandler;

    public McpToolbox(RepoHandler repoHandler) {
        this.repoHandler = repoHandler;
    }

    public String getCode(ClonedRepo repo, String nodeId) throws IOException, NodeNotFoundException {
        return repoHandler.getCodeChunk(repo, nodeId);
    }

    public String findDirectConnections(Graph graph, String nodeId) {
        return graph.bfs(nodeId, 1); // depth 1 for direct connections
    }

    public String folderTreeStructure(ClonedRepo repo, String folderPath) throws IOException {
        Path rootPath = repo.getClonedPath();
        Path targetPath = rootPath.resolve(folderPath);
        StringBuilder tree = new StringBuilder();

        if (!Files.exists(targetPath) || !Files.isDirectory(targetPath)) {
            return "Folder not found or is not a directory: " + folderPath;
        }

        Files.walkFileTree(targetPath, java.util.EnumSet.of(java.nio.file.FileVisitOption.FOLLOW_LINKS), 5, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                try {
                    String relativePath = rootPath.relativize(dir).toString();
                    if (!relativePath.isEmpty()) { 
                        int depth = targetPath.relativize(dir).getNameCount();
                        tree.append("  ").append("|".repeat(depth * 2)).append("-[D] "); 
                        tree.append(dir.getFileName()).append("/").append("\n");
                    }
                    return FileVisitResult.CONTINUE;
                } catch (AccessDeniedException e) {
                    tree.append("  ").append("|".repeat(targetPath.relativize(dir).getNameCount() * 2)).append("-[D] ");
                    tree.append(dir.getFileName()).append("/ (Access Denied)\n");
                    System.err.println("DEBUG: Access Denied for directory: " + dir + " - Skipping. Error: " + e.getMessage());
                    return FileVisitResult.SKIP_SUBTREE; // Skip this directory and its contents
                }
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                try {
                    String relativePath = rootPath.relativize(file).toString();
                    if (!relativePath.isEmpty()) {
                        int depth = targetPath.relativize(file).getNameCount();
                        tree.append("  ").append("|".repeat(depth * 2)).append("-[F] "); 
                        tree.append(file.getFileName()).append("\n");
                    }
                    return FileVisitResult.CONTINUE;
                } catch (AccessDeniedException e) {
                    tree.append("  ").append("|".repeat(targetPath.relativize(file).getNameCount() * 2)).append("-[F] ");
                    tree.append(file.getFileName()).append(" (Access Denied)\n");
                    System.err.println("DEBUG: Access Denied for file: " + file + " - Skipping. Error: " + e.getMessage());
                    return FileVisitResult.CONTINUE; // Continue to next file
                }
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) throws IOException {
                if (exc instanceof AccessDeniedException) {
                    tree.append("  ").append("|".repeat(targetPath.relativize(file).getNameCount() * 2)).append("-[E] ");
                    tree.append(file.getFileName()).append(" (Failed: Access Denied)\n");
                    System.err.println("DEBUG: Visit failed for path (Access Denied): " + file + " Error: " + exc.getMessage());
                    return FileVisitResult.CONTINUE; // Continue if a file visit fails
                }
                throw exc; // Re-throw other IOExceptions
            }
        });
        return tree.toString();
    }

    public List<String> getNodesInFile(Graph graph, String filePath) {
        return graph.getNodes().stream()
            .filter(node -> filePath.equals(node.getFilePath()) && node.getType() == GraphNode.NodeType.CLASS)
            .map(GraphNode::getLabel)
            .collect(Collectors.toList());
    }
}
