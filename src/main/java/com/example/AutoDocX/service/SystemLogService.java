package com.example.AutoDocX.service;

import com.example.AutoDocX.model.SystemLog;
import com.example.AutoDocX.repository.SystemLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class SystemLogService {
    
    @Autowired
    private SystemLogRepository systemLogRepository;
    
    @Autowired
    private LogAnalysisService logAnalysisService;
    
    /**
     * Save a new log entry
     */
    public SystemLog saveLog(SystemLog log) {
        return systemLogRepository.save(log);
    }
    
    /**
     * Get all logs with pagination
     */
    public Page<SystemLog> getAllLogs(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return systemLogRepository.findAll(pageable);
    }
    
    /**
     * Get logs by level with pagination
     */
    public Page<SystemLog> getLogsByLevel(String level, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return systemLogRepository.findByLevel(level, pageable);
    }
    
    /**
     * Search logs by message content
     */
    public Page<SystemLog> searchLogs(String searchTerm, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return systemLogRepository.findByMessageContaining(searchTerm, pageable);
    }
    
    /**
     * Get logs within time range
     */
    public Page<SystemLog> getLogsByTimeRange(LocalDateTime startTime, LocalDateTime endTime, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return systemLogRepository.findByTimestampBetween(startTime, endTime, pageable);
    }
    
    /**
     * Advanced search with multiple filters
     */
    public Page<SystemLog> searchWithFilters(String level, String logger, String searchTerm,
                                           LocalDateTime startTime, LocalDateTime endTime,
                                           String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return systemLogRepository.findWithFilters(level, logger, searchTerm, startTime, endTime, userId, pageable);
    }
    
    /**
     * Get error logs with stack traces
     */
    public Page<SystemLog> getErrorLogsWithStackTrace(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return systemLogRepository.findErrorLogsWithStackTrace(pageable);
    }
    
    /**
     * Get recent errors and warnings
     */
    public List<SystemLog> getRecentErrorsAndWarnings(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        return systemLogRepository.findRecentErrorsAndWarnings(since);
    }
    
    /**
     * Get slow operations
     */
    public Page<SystemLog> getSlowOperations(long thresholdMs, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("executionTime").descending());
        return systemLogRepository.findSlowOperations(thresholdMs, pageable);
    }
    
    /**
     * Get log statistics
     */
    public List<Object[]> getLogStatistics() {
        return systemLogRepository.countLogsByLevel();
    }
    
    /**
     * Get top active loggers
     */
    public List<Object[]> getTopLoggers(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return systemLogRepository.findTopLoggersByActivity(pageable);
    }
    
    /**
     * Get unique users from logs
     */
    public List<String> getUniqueUsers() {
        return systemLogRepository.findUniqueUsers();
    }
    
    /**
     * Get logs by user
     */
    public Page<SystemLog> getLogsByUser(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return systemLogRepository.findByUserId(userId, pageable);
    }
    
    /**
     * Get logs by session
     */
    public Page<SystemLog> getLogsBySession(String sessionId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return systemLogRepository.findBySessionId(sessionId, pageable);
    }
    
    /**
     * Get logs by IP address
     */
    public Page<SystemLog> getLogsByIpAddress(String ipAddress, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return systemLogRepository.findByIpAddress(ipAddress, pageable);
    }
    
    /**
     * Get context logs around a specific time
     */
    public List<SystemLog> getLogsAroundTime(LocalDateTime centerTime) {
        LocalDateTime startTime = centerTime.minusMinutes(5);
        LocalDateTime endTime = centerTime.plusMinutes(5);
        return systemLogRepository.findLogsAroundTime(startTime, endTime);
    }
    
    /**
     * Get log by ID
     */
    public Optional<SystemLog> getLogById(Long id) {
        return systemLogRepository.findById(id);
    }
    
    /**
     * Delete logs older than specified days
     */
    public void deleteOldLogs(int daysToKeep) {
        // Implementation would depend on requirements
        // Could add a custom delete query to repository
        // For now, this is a placeholder method
    }
    
    /**
     * Analyze error patterns using AI
     */
    public LogAnalysisService.ErrorAnalysis analyzeErrors(String searchTerm, int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        
        // Get error logs based on search criteria
        List<SystemLog> errorLogs;
        if (searchTerm != null && !searchTerm.trim().isEmpty()) {
            // Search in error logs with the term
            Page<SystemLog> errorPage = systemLogRepository.findWithFilters(
                "ERROR", null, searchTerm, since, null, null, 
                PageRequest.of(0, 100, Sort.by("timestamp").descending())
            );
            errorLogs = errorPage.getContent();
        } else {
            // Get all recent errors
            errorLogs = systemLogRepository.findRecentErrorsAndWarnings(since)
                    .stream()
                    .filter(log -> "ERROR".equals(log.getLevel()))
                    .toList();
        }
        
        return logAnalysisService.analyzeError(errorLogs);
    }
    
    /**
     * Generate system health metrics
     */
    public LogAnalysisService.HealthMetrics generateHealthMetrics(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        
        // Get logs from the specified time period
        Page<SystemLog> logsPage = systemLogRepository.findByTimestampBetween(
            since, LocalDateTime.now(),
            PageRequest.of(0, 10000, Sort.by("timestamp").descending())
        );
        
        return logAnalysisService.generateHealthMetrics(logsPage.getContent());
    }
    
    /**
     * Detect log patterns
     */
    public List<String> detectPatterns(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        
        Page<SystemLog> logsPage = systemLogRepository.findByTimestampBetween(
            since, LocalDateTime.now(),
            PageRequest.of(0, 5000, Sort.by("timestamp").descending())
        );
        
        return logAnalysisService.detectPatterns(logsPage.getContent());
    }
    
    /**
     * Create and save a log entry
     */
    public SystemLog createLog(String level, String logger, String message, 
                              String stackTrace, String userId, String sessionId,
                              String ipAddress, String userAgent, Long executionTime) {
        SystemLog log = new SystemLog(level, logger, message);
        log.setStackTrace(stackTrace);
        log.setUserId(userId);
        log.setSessionId(sessionId);
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        log.setExecutionTime(executionTime);
        
        // Set thread and class information if available
        Thread currentThread = Thread.currentThread();
        log.setThreadName(currentThread.getName());
        
        StackTraceElement[] stackTraceElements = currentThread.getStackTrace();
        if (stackTraceElements.length > 2) {
            StackTraceElement caller = stackTraceElements[2];
            log.setClassName(caller.getClassName());
            log.setMethodName(caller.getMethodName());
            log.setLineNumber(caller.getLineNumber());
        }
        
        return saveLog(log);
    }
    

    

}