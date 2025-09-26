package com.example.AutoDocX.controller;

import com.example.AutoDocX.model.Documentation;
import com.example.AutoDocX.service.DocumentationHandler;
import com.example.AutoDocX.service.Session;
import com.example.AutoDocX.service.SessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/documentation")
public class DocumentationController {

    private final SessionManager sessionManager;

    @Autowired
    public DocumentationController(SessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    @GetMapping
    public ResponseEntity<Map<String, Documentation>> getDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        if (session != null && session.getDocumentation() != null) {
            return ResponseEntity.ok(session.getDocumentation());
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/sections")
    public ResponseEntity<java.util.List<String>> listSections(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        if (session != null && session.getDocumentationHandler() != null) {
            java.util.List<String> sections = session.getDocumentationHandler().listSections(key);
            return ResponseEntity.ok(sections);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/section")
    public ResponseEntity<String> getSection(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key,
            @RequestParam String sectionPath
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        if (session != null && session.getDocumentationHandler() != null) {
            String sectionContent = session.getDocumentationHandler().getSection(key, sectionPath);
            if (sectionContent != null) {
                return ResponseEntity.ok(sectionContent);
            }
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/single")
    public ResponseEntity<Documentation> getSingleDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        if (session != null && session.getDocumentationHandler() != null) {
            Documentation doc = session.getDocumentationHandler().get(key);
            if (doc != null) {
                return ResponseEntity.ok(doc);
            }
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/single")
    public ResponseEntity<Void> createDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key,
            @RequestBody String content
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        if (session != null && session.getDocumentationHandler() != null) {
            session.getDocumentationHandler().save(key, new Documentation(content));
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.badRequest().build();
    }

    @PutMapping("/single")
    public ResponseEntity<Void> updateDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key,
            @RequestBody String content
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        if (session != null && session.getDocumentationHandler() != null) {
            Documentation doc = session.getDocumentationHandler().get(key);
            if (doc != null) {
                doc.setContent(content);
                session.getDocumentationHandler().save(key, doc);
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        }
        return ResponseEntity.badRequest().build();
    }

    @DeleteMapping("/single")
    public ResponseEntity<Void> deleteDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        if (session != null && session.getDocumentationHandler() != null) {
            session.getDocumentationHandler().delete(key);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.badRequest().build();
    }

    @PostMapping("/default")
    public ResponseEntity<Void> setDefaultDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        if (session != null && session.getDocumentationHandler() != null) {
            if (session.getDocumentationHandler().setDefaultDocumentationKey(key)) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        }
        return ResponseEntity.badRequest().build();
    }
}
