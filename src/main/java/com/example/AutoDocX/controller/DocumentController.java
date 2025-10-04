package com.example.AutoDocX.controller;

import com.example.AutoDocX.model.Documentation;
import com.example.AutoDocX.service.DocumentHandlingService;
import com.example.AutoDocX.service.DocumentationHandler;
import com.example.AutoDocX.service.Session;
import com.example.AutoDocX.service.SessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/documentation")
public class DocumentController {

    private final SessionManager sessionManager;
    private final DocumentHandlingService documentHandlingService;

    @Autowired
    public DocumentController(SessionManager sessionManager, DocumentHandlingService documentHandlingService) {
        this.sessionManager = sessionManager;
        this.documentHandlingService = documentHandlingService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Documentation>> getDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
        return ResponseEntity.ok(handler.getAll());
    }

    @GetMapping("/sections")
    public ResponseEntity<java.util.List<String>> listSections(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
        java.util.List<String> sections = handler.listSections(key);
        return ResponseEntity.ok(sections);
    }

    @GetMapping("/section")
    public ResponseEntity<String> getSection(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key,
            @RequestParam String sectionPath
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
        String sectionContent = handler.getSection(key, sectionPath);
        if (sectionContent != null) {
            return ResponseEntity.ok(sectionContent);
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
        DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
        Documentation doc = handler.get(key);
        if (doc != null) {
            return ResponseEntity.ok(doc);
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
        DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
        handler.save(key, new Documentation(content));
        return ResponseEntity.ok().build();
    }

    @PutMapping("/single")
    public ResponseEntity<Void> updateDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key,
            @RequestBody String content
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
        Documentation doc = handler.get(key);
        if (doc != null) {
            doc.setContent(content);
            handler.save(key, doc);
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/single")
    public ResponseEntity<Void> deleteDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
        handler.delete(key);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/default")
    public ResponseEntity<Void> setDefaultDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key
    ) {
        Session session = sessionManager.getSession(gitUrl, branch);
        DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
        if (handler.setDefaultDocumentationKey(key)) {
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
