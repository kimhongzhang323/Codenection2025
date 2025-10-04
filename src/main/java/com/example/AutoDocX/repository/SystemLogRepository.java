package com.example.AutoDocX.repository;

import com.example.AutoDocX.model.SystemLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SystemLogRepository extends JpaRepository<SystemLog, Long> {
    
    // Find logs by level
    Page<SystemLog> findByLevel(String level, Pageable pageable);
    
    // Find logs by logger name
    Page<SystemLog> findByLogger(String logger, Pageable pageable);
    
    // Find logs within time range
    @Query("SELECT sl FROM SystemLog sl WHERE sl.timestamp BETWEEN :startTime AND :endTime ORDER BY sl.timestamp DESC")
    Page<SystemLog> findByTimestampBetween(@Param("startTime") LocalDateTime startTime, 
                                          @Param("endTime") LocalDateTime endTime, 
                                          Pageable pageable);
    
    // Search logs by message content
    @Query("SELECT sl FROM SystemLog sl WHERE LOWER(sl.message) LIKE LOWER(CONCAT('%', :searchTerm, '%')) ORDER BY sl.timestamp DESC")
    Page<SystemLog> findByMessageContaining(@Param("searchTerm") String searchTerm, Pageable pageable);
    
    // Find error logs with stack traces
    @Query("SELECT sl FROM SystemLog sl WHERE sl.level = 'ERROR' AND sl.stackTrace IS NOT NULL ORDER BY sl.timestamp DESC")
    Page<SystemLog> findErrorLogsWithStackTrace(Pageable pageable);
    
    // Find logs by user
    Page<SystemLog> findByUserId(String userId, Pageable pageable);
    
    // Find logs by session
    Page<SystemLog> findBySessionId(String sessionId, Pageable pageable);
    
    // Advanced search with multiple filters
    @Query("SELECT sl FROM SystemLog sl WHERE " +
           "(:level IS NULL OR sl.level = :level) AND " +
           "(:logger IS NULL OR sl.logger = :logger) AND " +
           "(:searchTerm IS NULL OR LOWER(sl.message) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) AND " +
           "(:startTime IS NULL OR sl.timestamp >= :startTime) AND " +
           "(:endTime IS NULL OR sl.timestamp <= :endTime) AND " +
           "(:userId IS NULL OR sl.userId = :userId) " +
           "ORDER BY sl.timestamp DESC")
    Page<SystemLog> findWithFilters(@Param("level") String level,
                                   @Param("logger") String logger,
                                   @Param("searchTerm") String searchTerm,
                                   @Param("startTime") LocalDateTime startTime,
                                   @Param("endTime") LocalDateTime endTime,
                                   @Param("userId") String userId,
                                   Pageable pageable);
    
    // Count logs by level
    @Query("SELECT sl.level, COUNT(sl) FROM SystemLog sl GROUP BY sl.level")
    List<Object[]> countLogsByLevel();
    
    // Get recent error summary
    @Query("SELECT sl FROM SystemLog sl WHERE sl.level IN ('ERROR', 'WARN') AND sl.timestamp >= :since ORDER BY sl.timestamp DESC")
    List<SystemLog> findRecentErrorsAndWarnings(@Param("since") LocalDateTime since);
    
    // Find logs by execution time threshold (for performance monitoring)
    @Query("SELECT sl FROM SystemLog sl WHERE sl.executionTime IS NOT NULL AND sl.executionTime > :threshold ORDER BY sl.executionTime DESC")
    Page<SystemLog> findSlowOperations(@Param("threshold") Long thresholdMs, Pageable pageable);
    
    // Get top loggers by activity
    @Query("SELECT sl.logger, COUNT(sl) as logCount FROM SystemLog sl GROUP BY sl.logger ORDER BY logCount DESC")
    List<Object[]> findTopLoggersByActivity(Pageable pageable);
    
    // Find unique users in logs
    @Query("SELECT DISTINCT sl.userId FROM SystemLog sl WHERE sl.userId IS NOT NULL ORDER BY sl.userId")
    List<String> findUniqueUsers();
    
    // Find logs by IP address
    Page<SystemLog> findByIpAddress(String ipAddress, Pageable pageable);
    
    // Get logs around a specific time (for context analysis)
    @Query("SELECT sl FROM SystemLog sl WHERE sl.timestamp BETWEEN :centerTime - INTERVAL 5 MINUTE AND :centerTime + INTERVAL 5 MINUTE ORDER BY sl.timestamp")
    List<SystemLog> findLogsAroundTime(@Param("centerTime") LocalDateTime centerTime);
}