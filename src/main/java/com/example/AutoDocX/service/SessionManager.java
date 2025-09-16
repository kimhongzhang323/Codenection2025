package com.example.AutoDocX.service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class SessionManager {
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    public Session getSession(String gitUrl) {
        return getSession(gitUrl, null);
    }

    public Session getSession(String gitUrl, String branch) {
        String sessionKey = gitUrl + (branch == null ? "" : "#" + branch);
        return sessions.computeIfAbsent(sessionKey, k -> new Session(gitUrl, branch));
    }
}
