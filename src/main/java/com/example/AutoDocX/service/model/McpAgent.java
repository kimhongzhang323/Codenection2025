package com.example.AutoDocX.service.model;

import com.example.AutoDocX.service.Session;

import java.util.List;

public interface McpAgent {
    String getCode(String nodeIdOrLabel, Session session);
    List<String> findDirectConnections(String nodeIdOrLabel, Session session);
    String folderTreeStructure(String folderPath, Session session);
    List<String> getNodesInFile(String filePath, Session session);
}
