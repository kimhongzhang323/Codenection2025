package com.example.AutoDocX.service;

import com.example.AutoDocX.model.DocumentVersion;
import com.example.AutoDocX.repository.DocumentVersionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class DocumentVersionService {

    @Autowired
    private DocumentVersionRepository documentVersionRepository;

    /**
     * Save a new version of a document
     */
    public DocumentVersion saveVersion(String documentPath, String repositoryUrl, String content, 
                                     String authorName, String authorEmail, String changeDescription) {
        
        // Get the next version number
        Integer nextVersionNumber = documentVersionRepository.findNextVersionNumber(documentPath, repositoryUrl);
        
        // Create new version
        DocumentVersion version = new DocumentVersion(
            documentPath, repositoryUrl, nextVersionNumber, content, 
            authorName, authorEmail, changeDescription, "UPDATE"
        );
        
        // Set parent version if exists
        Optional<DocumentVersion> latestVersion = documentVersionRepository.findLatestVersion(documentPath, repositoryUrl);
        if (latestVersion.isPresent() && !latestVersion.get().getVersionNumber().equals(nextVersionNumber)) {
            version.setParentVersionId(latestVersion.get().getId());
        }
        
        return documentVersionRepository.save(version);
    }

    /**
     * Create initial version of a document
     */
    public DocumentVersion createInitialVersion(String documentPath, String repositoryUrl, String content,
                                              String authorName, String authorEmail) {
        DocumentVersion version = new DocumentVersion(
            documentPath, repositoryUrl, 1, content, 
            authorName, authorEmail, "Initial version", "CREATE"
        );
        
        return documentVersionRepository.save(version);
    }

    /**
     * Get all versions of a document
     */
    public List<DocumentVersion> getDocumentVersions(String documentPath, String repositoryUrl) {
        return documentVersionRepository.findByDocumentPathAndRepositoryUrlOrderByVersionNumberDesc(
            documentPath, repositoryUrl);
    }

    /**
     * Get latest version of a document
     */
    public Optional<DocumentVersion> getLatestVersion(String documentPath, String repositoryUrl) {
        return documentVersionRepository.findLatestVersion(documentPath, repositoryUrl);
    }

    /**
     * Get a specific version by ID
     */
    public Optional<DocumentVersion> getVersionById(Long versionId) {
        return documentVersionRepository.findById(versionId);
    }

    /**
     * Compare two versions and return differences
     */
    public VersionComparison compareVersions(Long version1Id, Long version2Id) {
        Optional<DocumentVersion> v1 = documentVersionRepository.findById(version1Id);
        Optional<DocumentVersion> v2 = documentVersionRepository.findById(version2Id);
        
        if (v1.isEmpty() || v2.isEmpty()) {
            throw new IllegalArgumentException("One or both versions not found");
        }
        
        return new VersionComparison(v1.get(), v2.get());
    }

    /**
     * Restore a document to a specific version
     */
    public DocumentVersion restoreToVersion(Long versionId, String authorName, String authorEmail) {
        Optional<DocumentVersion> versionToRestore = documentVersionRepository.findById(versionId);
        if (versionToRestore.isEmpty()) {
            throw new IllegalArgumentException("Version not found");
        }
        
        DocumentVersion original = versionToRestore.get();
        
        // Create a new version with the content from the restored version
        return saveVersion(
            original.getDocumentPath(),
            original.getRepositoryUrl(),
            original.getContent(),
            authorName,
            authorEmail,
            "Restored to version " + original.getVersionNumber()
        );
    }

    /**
     * Get version history summary for a repository
     */
    public List<Object> getVersionHistorySummary(String repositoryUrl) {
        return documentVersionRepository.findVersionHistorySummary(repositoryUrl);
    }

    /**
     * Get versions by author
     */
    public List<DocumentVersion> getVersionsByAuthor(String authorEmail, String repositoryUrl) {
        return documentVersionRepository.findByAuthorEmailAndRepositoryUrlOrderByCreatedAtDesc(
            authorEmail, repositoryUrl);
    }

    /**
     * Get versions within date range
     */
    public List<DocumentVersion> getVersionsByDateRange(String repositoryUrl, LocalDateTime startDate, LocalDateTime endDate) {
        return documentVersionRepository.findByRepositoryUrlAndCreatedAtBetweenOrderByCreatedAtDesc(
            repositoryUrl, startDate, endDate);
    }

    /**
     * Get all documents in a repository
     */
    public List<String> getDocumentsInRepository(String repositoryUrl) {
        return documentVersionRepository.findDistinctDocumentPaths(repositoryUrl);
    }

    /**
     * Inner class for version comparison results
     */
    public static class VersionComparison {
        private final DocumentVersion version1;
        private final DocumentVersion version2;
        private final String differences;

        public VersionComparison(DocumentVersion version1, DocumentVersion version2) {
            this.version1 = version1;
            this.version2 = version2;
            this.differences = calculateDifferences(version1.getContent(), version2.getContent());
        }

        private String calculateDifferences(String content1, String content2) {
            // Simple diff calculation - in production, you might want to use a more sophisticated diff algorithm
            if (content1.equals(content2)) {
                return "No changes";
            }
            
            String[] lines1 = content1.split("\n");
            String[] lines2 = content2.split("\n");
            
            StringBuilder diff = new StringBuilder();
            int maxLines = Math.max(lines1.length, lines2.length);
            
            for (int i = 0; i < maxLines; i++) {
                String line1 = i < lines1.length ? lines1[i] : "";
                String line2 = i < lines2.length ? lines2[i] : "";
                
                if (!line1.equals(line2)) {
                    diff.append("Line ").append(i + 1).append(":\n");
                    diff.append("- ").append(line1).append("\n");
                    diff.append("+ ").append(line2).append("\n");
                }
            }
            
            return diff.toString();
        }

        // Getters
        public DocumentVersion getVersion1() { return version1; }
        public DocumentVersion getVersion2() { return version2; }
        public String getDifferences() { return differences; }
    }
}