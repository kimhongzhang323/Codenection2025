package com.example.AutoDocX.controller;

import com.example.AutoDocX.model.Documentation;
import com.example.AutoDocX.service.DocumentHandlingService;
import com.example.AutoDocX.service.DocumentationHandler;
import com.example.AutoDocX.service.agent.data.Session;
import com.example.AutoDocX.service.SessionManager;
import com.example.AutoDocX.util.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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
    public ResponseEntity<ApiResponse<Map<String, Documentation>>> getDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch
    ) {
        try {
            Session session = sessionManager.getSession(gitUrl, branch);
            DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
            return new ResponseEntity<>(ApiResponse.success("Documentation retrieved successfully", handler.getAll()), HttpStatus.OK);
        } catch (IllegalArgumentException ex) {
            return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/sections")
    public ResponseEntity<ApiResponse<java.util.List<String>>> listSections(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key
    ) {
        try {
            Session session = sessionManager.getSession(gitUrl, branch);
            DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
            java.util.List<String> sections = handler.listSections(key);
            return new ResponseEntity<>(ApiResponse.success("Sections retrieved successfully", sections), HttpStatus.OK);
        } catch (IllegalArgumentException ex) {
            return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/section")
    public ResponseEntity<ApiResponse<String>> getSection(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key,
            @RequestParam String sectionPath
    ) {
        try {
            Session session = sessionManager.getSession(gitUrl, branch);
            DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
            String sectionContent = handler.getSection(key, sectionPath);
            if (sectionContent != null) {
                return new ResponseEntity<>(ApiResponse.success("Section content retrieved successfully", sectionContent), HttpStatus.OK);
            } else {
                return new ResponseEntity<>(ApiResponse.error("Section not found"), HttpStatus.NOT_FOUND);
            }
        } catch (IllegalArgumentException ex) {
            return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/single")
    public ResponseEntity<ApiResponse<Documentation>> getSingleDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key
    ) {
        try {
            Session session = sessionManager.getSession(gitUrl, branch);
            DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
            Documentation doc = handler.get(key);
            if (doc != null) {
                return new ResponseEntity<>(ApiResponse.success("Documentation retrieved successfully", doc), HttpStatus.OK);
            } else {
                return new ResponseEntity<>(ApiResponse.error("Documentation not found"), HttpStatus.NOT_FOUND);
            }
        } catch (IllegalArgumentException ex) {
            return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/single")
    public ResponseEntity<ApiResponse<Void>> createDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key,
            @RequestBody String content
    ) {
        try {
            Session session = sessionManager.getSession(gitUrl, branch);
            DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
            handler.save(key, new Documentation(content));
            return new ResponseEntity<>(ApiResponse.success("Documentation created successfully", null), HttpStatus.CREATED);
        } catch (IllegalArgumentException ex) {
            return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping("/single")
    public ResponseEntity<ApiResponse<Void>> updateDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key,
            @RequestBody String content
    ) {
        try {
            Session session = sessionManager.getSession(gitUrl, branch);
            DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
            Documentation doc = handler.get(key);
            if (doc != null) {
                doc.setContent(content);
                handler.save(key, doc);
                return new ResponseEntity<>(ApiResponse.success("Documentation updated successfully", null), HttpStatus.OK);
            } else {
                return new ResponseEntity<>(ApiResponse.error("Documentation not found"), HttpStatus.NOT_FOUND);
            }
        } catch (IllegalArgumentException ex) {
            return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
        }
    }

    @DeleteMapping("/single")
    public ResponseEntity<ApiResponse<Void>> deleteDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key
    ) {
        try {
            Session session = sessionManager.getSession(gitUrl, branch);
            DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
            handler.delete(key);
            return new ResponseEntity<>(ApiResponse.success("Documentation deleted successfully", null), HttpStatus.OK);
        } catch (IllegalArgumentException ex) {
            return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
        }
    }

    @PostMapping("/default")
    public ResponseEntity<ApiResponse<Void>> setDefaultDocumentation(
            @RequestParam String gitUrl,
            @RequestParam(required = false) String branch,
            @RequestParam String key
    ) {
        try {
            Session session = sessionManager.getSession(gitUrl, branch);
            DocumentationHandler handler = documentHandlingService.getDocumentHandler(session);
            if (handler.setDefaultDocumentationKey(key)) {
                return new ResponseEntity<>(ApiResponse.success("Default documentation set successfully", null), HttpStatus.OK);
            } else {
                return new ResponseEntity<>(ApiResponse.error("Documentation not found"), HttpStatus.NOT_FOUND);
            }
        } catch (IllegalArgumentException ex) {
            return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
        }
    }
}
