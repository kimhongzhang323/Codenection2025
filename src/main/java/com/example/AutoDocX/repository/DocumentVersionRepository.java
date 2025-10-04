package com.example.AutoDocX.repository;

import com.example.AutoDocX.model.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, Long> {
    
    /**
     * Find all versions of a document ordered by version number descending
     */
    List<DocumentVersion> findByDocumentPathAndRepositoryUrlOrderByVersionNumberDesc(
        String documentPath, String repositoryUrl);
    
    /**
     * Find the latest version of a document
     */
    @Query("SELECT dv FROM DocumentVersion dv WHERE dv.documentPath = :documentPath " +
           "AND dv.repositoryUrl = :repositoryUrl ORDER BY dv.versionNumber DESC LIMIT 1")
    Optional<DocumentVersion> findLatestVersion(@Param("documentPath") String documentPath, 
                                               @Param("repositoryUrl") String repositoryUrl);
    
    /**
     * Find the next version number for a document
     */
    @Query("SELECT COALESCE(MAX(dv.versionNumber), 0) + 1 FROM DocumentVersion dv " +
           "WHERE dv.documentPath = :documentPath AND dv.repositoryUrl = :repositoryUrl")
    Integer findNextVersionNumber(@Param("documentPath") String documentPath, 
                                 @Param("repositoryUrl") String repositoryUrl);
    
    /**
     * Find versions by author
     */
    List<DocumentVersion> findByAuthorEmailAndRepositoryUrlOrderByCreatedAtDesc(
        String authorEmail, String repositoryUrl);
    
    /**
     * Find versions within date range
     */
    List<DocumentVersion> findByRepositoryUrlAndCreatedAtBetweenOrderByCreatedAtDesc(
        String repositoryUrl, LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * Find all documents in a repository
     */
    @Query("SELECT DISTINCT dv.documentPath FROM DocumentVersion dv WHERE dv.repositoryUrl = :repositoryUrl")
    List<String> findDistinctDocumentPaths(@Param("repositoryUrl") String repositoryUrl);
    
    /**
     * Get version history summary for a repository
     */
    @Query("SELECT new map(dv.documentPath as documentPath, COUNT(dv) as versionCount, " +
           "MAX(dv.createdAt) as lastModified, MAX(dv.authorName) as lastAuthor) " +
           "FROM DocumentVersion dv WHERE dv.repositoryUrl = :repositoryUrl " +
           "GROUP BY dv.documentPath ORDER BY MAX(dv.createdAt) DESC")
    List<Object> findVersionHistorySummary(@Param("repositoryUrl") String repositoryUrl);
}