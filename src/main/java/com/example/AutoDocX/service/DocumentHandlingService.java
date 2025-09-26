package com.example.AutoDocX.service;

import com.example.AutoDocX.model.ClonedRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DocumentHandlingService {

    private final RepoHandler repoHandler;
    private final Map<String, Boolean> loadedSessions = new ConcurrentHashMap<>();

    @Autowired
    public DocumentHandlingService(RepoHandler repoHandler) {
        this.repoHandler = repoHandler;
    }

    public DocumentationHandler getDocumentHandler(Session session) {
        String sessionKey = getSessionKey(session);
        // Use computeIfAbsent for a thread-safe, atomic check-and-load operation.
        loadedSessions.computeIfAbsent(sessionKey, key -> {
            ClonedRepo repo = repoHandler.getRepo(session.getGitUrl(), session.getBranch());
            if (repo != null && repo.getClonedPath() != null) {
                session.getDocumentationHandler().loadFromDirectory(repo.getClonedPath(), repoHandler.getGitService());
                return true; // Mark as loaded
            }
            return false; // Mark as not loaded if repo was unavailable
        });
        return session.getDocumentationHandler();
    }

    private String getSessionKey(Session session) {
        return session.getGitUrl() + ":" + session.getBranch();
    }
}
