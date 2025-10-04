package com.example.AutoDocX.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "document_versions")
public class DocumentVersion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String documentPath;
    
    @Column(nullable = false)
    private String repositoryUrl;
    
    @Column(nullable = false)
    private Integer versionNumber;
    
    @Lob
    @Column(nullable = false, columnDefinition = "CLOB")
    private String content;
    
    @Column(nullable = false)
    private String authorName;
    
    @Column(nullable = false)
    private String authorEmail;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @Column(length = 1000)
    private String changeDescription;
    
    @Column(nullable = false)
    private String changeType; // CREATE, UPDATE, DELETE
    
    @Column
    private Long parentVersionId;
    
    // Constructors
    public DocumentVersion() {
        this.createdAt = LocalDateTime.now();
    }
    
    public DocumentVersion(String documentPath, String repositoryUrl, Integer versionNumber, 
                          String content, String authorName, String authorEmail, String changeDescription, String changeType) {
        this();
        this.documentPath = documentPath;
        this.repositoryUrl = repositoryUrl;
        this.versionNumber = versionNumber;
        this.content = content;
        this.authorName = authorName;
        this.authorEmail = authorEmail;
        this.changeDescription = changeDescription;
        this.changeType = changeType;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getDocumentPath() { return documentPath; }
    public void setDocumentPath(String documentPath) { this.documentPath = documentPath; }
    
    public String getRepositoryUrl() { return repositoryUrl; }
    public void setRepositoryUrl(String repositoryUrl) { this.repositoryUrl = repositoryUrl; }
    
    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) { this.versionNumber = versionNumber; }
    
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    
    public String getAuthorEmail() { return authorEmail; }
    public void setAuthorEmail(String authorEmail) { this.authorEmail = authorEmail; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public String getChangeDescription() { return changeDescription; }
    public void setChangeDescription(String changeDescription) { this.changeDescription = changeDescription; }
    
    public String getChangeType() { return changeType; }
    public void setChangeType(String changeType) { this.changeType = changeType; }
    
    public Long getParentVersionId() { return parentVersionId; }
    public void setParentVersionId(Long parentVersionId) { this.parentVersionId = parentVersionId; }
}