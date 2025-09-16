package com.example.AutoDocX.repository.record;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RepoRecord {
    private String repoLink;
    private String clonedPath;
}
