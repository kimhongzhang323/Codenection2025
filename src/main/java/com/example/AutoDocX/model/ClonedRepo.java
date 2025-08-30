package com.example.AutoDocX.model;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.nio.file.Path;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClonedRepo {
    private String repoLink;
    private Path clonedPath;
    private String commitHash;
}
