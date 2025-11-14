package com.example.AutoDocX.service;

import com.example.AutoDocX.service.agent.data.Session;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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
