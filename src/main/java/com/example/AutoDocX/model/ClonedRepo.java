package com.example.AutoDocX.model;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.nio.file.Path;

import com.example.AutoDocX.parser.model.Graph;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClonedRepo {
    private String repoLink;
    private String branch; // Added branch
    private Path clonedPath;
    private String commitHash;
    private Graph graph;
}
