package com.example.AutoDocX.controller;

import com.example.AutoDocX.model.SystemLog;
import com.example.AutoDocX.service.LogAnalysisService;
import com.example.AutoDocX.service.SystemLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "http://localhost:3000")
public class SystemLogController {
    
    @Autowired
    private SystemLogService systemLogService;
    
    /**
     * Get all logs with pagination
     */
    @GetMapping
    public ResponseEntity<Page<SystemLog>> getAllLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SystemLog> logs = systemLogService.getAllLogs(page, size);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Get logs by level
     */
    @GetMapping("/level/{level}")
    public ResponseEntity<Page<SystemLog>> getLogsByLevel(
            @PathVariable String level,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SystemLog> logs = systemLogService.getLogsByLevel(level.toUpperCase(), page, size);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Search logs by message content
     */
    @GetMapping("/search")
    public ResponseEntity<Page<SystemLog>> searchLogs(
            @RequestParam String term,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SystemLog> logs = systemLogService.searchLogs(term, page, size);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Advanced search with filters
     */
    @GetMapping("/advanced-search")
    public ResponseEntity<Page<SystemLog>> advancedSearch(
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String logger,
            @RequestParam(required = false) String term,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(required = false) String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Page<SystemLog> logs = systemLogService.searchWithFilters(
            level, logger, term, startTime, endTime, userId, page, size);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Get logs within time range
     */
    @GetMapping("/time-range")
    public ResponseEntity<Page<SystemLog>> getLogsByTimeRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Page<SystemLog> logs = systemLogService.getLogsByTimeRange(startTime, endTime, page, size);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Get error logs with stack traces
     */
    @GetMapping("/errors")
    public ResponseEntity<Page<SystemLog>> getErrorLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SystemLog> logs = systemLogService.getErrorLogsWithStackTrace(page, size);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Get recent errors and warnings
     */
    @GetMapping("/recent-issues")
    public ResponseEntity<List<SystemLog>> getRecentIssues(
            @RequestParam(defaultValue = "24") int hours) {
        List<SystemLog> logs = systemLogService.getRecentErrorsAndWarnings(hours);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Get slow operations
     */
    @GetMapping("/slow-operations")
    public ResponseEntity<Page<SystemLog>> getSlowOperations(
            @RequestParam(defaultValue = "1000") long thresholdMs,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SystemLog> logs = systemLogService.getSlowOperations(thresholdMs, page, size);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Get log statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<List<Object[]>> getLogStatistics() {
        List<Object[]> stats = systemLogService.getLogStatistics();
        return ResponseEntity.ok(stats);
    }
    
    /**
     * Get top active loggers
     */
    @GetMapping("/top-loggers")
    public ResponseEntity<List<Object[]>> getTopLoggers(
            @RequestParam(defaultValue = "10") int limit) {
        List<Object[]> topLoggers = systemLogService.getTopLoggers(limit);
        return ResponseEntity.ok(topLoggers);
    }
    
    /**
     * Get unique users
     */
    @GetMapping("/users")
    public ResponseEntity<List<String>> getUniqueUsers() {
        List<String> users = systemLogService.getUniqueUsers();
        return ResponseEntity.ok(users);
    }
    
    /**
     * Get logs by user
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<SystemLog>> getLogsByUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SystemLog> logs = systemLogService.getLogsByUser(userId, page, size);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Get logs by session
     */
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<Page<SystemLog>> getLogsBySession(
            @PathVariable String sessionId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SystemLog> logs = systemLogService.getLogsBySession(sessionId, page, size);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Get logs by IP address
     */
    @GetMapping("/ip/{ipAddress}")
    public ResponseEntity<Page<SystemLog>> getLogsByIpAddress(
            @PathVariable String ipAddress,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SystemLog> logs = systemLogService.getLogsByIpAddress(ipAddress, page, size);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Get log by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<SystemLog> getLogById(@PathVariable Long id) {
        Optional<SystemLog> log = systemLogService.getLogById(id);
        return log.map(ResponseEntity::ok)
                  .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * Get context logs around a specific time
     */
    @GetMapping("/context")
    public ResponseEntity<List<SystemLog>> getLogsAroundTime(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime centerTime) {
        List<SystemLog> logs = systemLogService.getLogsAroundTime(centerTime);
        return ResponseEntity.ok(logs);
    }
    
    /**
     * Create a new log entry
     */
    @PostMapping
    public ResponseEntity<SystemLog> createLog(@RequestBody SystemLog log) {
        SystemLog savedLog = systemLogService.saveLog(log);
        return ResponseEntity.ok(savedLog);
    }
    
    /**
     * Create a log entry with parameters
     */
    @PostMapping("/create")
    public ResponseEntity<SystemLog> createLogWithParams(
            @RequestParam String level,
            @RequestParam String logger,
            @RequestParam String message,
            @RequestParam(required = false) String stackTrace,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) String userAgent,
            @RequestParam(required = false) Long executionTime) {
        
        SystemLog log = systemLogService.createLog(
            level, logger, message, stackTrace, userId, sessionId, 
            ipAddress, userAgent, executionTime);
        return ResponseEntity.ok(log);
    }
    
    // AI-powered analysis endpoints
    
    /**
     * Analyze errors using AI
     */
    @GetMapping("/analyze-errors")
    public ResponseEntity<LogAnalysisService.ErrorAnalysis> analyzeErrors(
            @RequestParam(required = false) String searchTerm,
            @RequestParam(defaultValue = "24") int hours) {
        LogAnalysisService.ErrorAnalysis analysis = systemLogService.analyzeErrors(searchTerm, hours);
        return ResponseEntity.ok(analysis);
    }
    
    /**
     * Generate system health metrics
     */
    @GetMapping("/health-metrics")
    public ResponseEntity<LogAnalysisService.HealthMetrics> getHealthMetrics(
            @RequestParam(defaultValue = "24") int hours) {
        LogAnalysisService.HealthMetrics metrics = systemLogService.generateHealthMetrics(hours);
        return ResponseEntity.ok(metrics);
    }
    
    /**
     * Detect log patterns
     */
    @GetMapping("/patterns")
    public ResponseEntity<List<String>> detectPatterns(
            @RequestParam(defaultValue = "24") int hours) {
        List<String> patterns = systemLogService.detectPatterns(hours);
        return ResponseEntity.ok(patterns);
    }
}