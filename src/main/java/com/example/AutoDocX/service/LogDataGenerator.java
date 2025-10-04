package com.example.AutoDocX.service;

import com.example.AutoDocX.model.SystemLog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

@Service
public class LogDataGenerator {
    
    @Autowired
    private SystemLogService systemLogService;
    
    private final Random random = new Random();
    
    private final List<String> loggers = Arrays.asList(
        "com.example.AutoDocX.controller.DocumentController",
        "com.example.AutoDocX.service.DocumentService",
        "com.example.AutoDocX.service.SummarizerService",
        "com.example.AutoDocX.service.GitHubService",
        "com.example.AutoDocX.repository.DocumentRepository",
        "org.springframework.web.servlet.DispatcherServlet",
        "org.hibernate.SQL",
        "com.zaxxer.hikari.pool.HikariPool"
    );
    
    private final List<String> infoMessages = Arrays.asList(
        "Processing document generation request",
        "Successfully retrieved repository data from GitHub",
        "Document creation completed successfully",
        "Cache miss for repository data, fetching from API",
        "User authentication successful",
        "Session created for user",
        "File uploaded successfully",
        "Background job completed",
        "Health check passed",
        "Configuration loaded successfully"
    );
    
    private final List<String> warnMessages = Arrays.asList(
        "Rate limit approaching for GitHub API",
        "Document generation took longer than expected",
        "Cache size exceeding recommended threshold",
        "Large file upload detected",
        "Deprecated API endpoint being used",
        "High memory usage detected",
        "Connection pool size approaching limit",
        "Slow query detected in database"
    );
    
    private final List<String> errorMessages = Arrays.asList(
        "Failed to connect to GitHub API",
        "Document generation failed due to invalid input",
        "Database connection timeout",
        "File not found during processing",
        "Authentication token expired",
        "Insufficient permissions to access repository",
        "Out of memory error during large document processing",
        "Network timeout while fetching repository data"
    );
    
    private final List<String> stackTraces = Arrays.asList(
        """
        java.lang.NullPointerException: Cannot invoke "String.length()" because "text" is null
            at com.example.AutoDocX.service.DocumentService.processDocument(DocumentService.java:45)
            at com.example.AutoDocX.controller.DocumentController.createDocument(DocumentController.java:82)
            at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
            at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:77)
        """,
        """
        org.springframework.web.client.ResourceAccessException: I/O error on GET request for "https://api.github.com/repos/user/repo": Connect timed out
            at org.springframework.web.client.RestTemplate.doExecute(RestTemplate.java:785)
            at com.example.AutoDocX.service.GitHubService.fetchRepository(GitHubService.java:67)
            at com.example.AutoDocX.service.DocumentService.generateDocumentation(DocumentService.java:123)
        """,
        """
        java.sql.SQLException: Connection is not available, request timed out after 30000ms
            at com.zaxxer.hikari.pool.HikariPool.createTimeoutException(HikariPool.java:695)
            at com.zaxxer.hikari.pool.HikariPool.getConnection(HikariPool.java:197)
            at com.zaxxer.hikari.pool.HikariDataSource.getConnection(HikariDataSource.java:128)
        """
    );
    
    @EventListener(ApplicationReadyEvent.class)
    public void generateSampleLogs() {
        // Generate sample logs for the last 24 hours
        generateLogsForPeriod(LocalDateTime.now().minusHours(24), LocalDateTime.now(), 500);
    }
    
    private void generateLogsForPeriod(LocalDateTime start, LocalDateTime end, int count) {
        for (int i = 0; i < count; i++) {
            SystemLog log = createRandomLog(start, end);
            systemLogService.saveLog(log);
        }
    }
    
    private SystemLog createRandomLog(LocalDateTime start, LocalDateTime end) {
        SystemLog log = new SystemLog();
        
        // Random timestamp between start and end
        long startEpoch = start.atZone(java.time.ZoneOffset.UTC).toInstant().toEpochMilli();
        long endEpoch = end.atZone(java.time.ZoneOffset.UTC).toInstant().toEpochMilli();
        long randomEpoch = startEpoch + (long) (random.nextDouble() * (endEpoch - startEpoch));
        log.setTimestamp(LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(randomEpoch), java.time.ZoneOffset.UTC));
        
        // Random level with weighted distribution
        String level = getRandomLevel();
        log.setLevel(level);
        
        // Random logger
        log.setLogger(loggers.get(random.nextInt(loggers.size())));
        
        // Message based on level
        String message = getMessageForLevel(level);
        log.setMessage(message);
        
        // Add stack trace for some error logs
        if ("ERROR".equals(level) && random.nextBoolean()) {
            log.setStackTrace(stackTraces.get(random.nextInt(stackTraces.size())));
        }
        
        // Random thread name
        log.setThreadName("http-nio-8080-exec-" + (random.nextInt(10) + 1));
        
        // Random class and method info
        String logger = log.getLogger();
        String[] parts = logger.split("\\.");
        if (parts.length > 0) {
            log.setClassName(logger);
            log.setMethodName(getRandomMethodName());
            log.setLineNumber(random.nextInt(200) + 50);
        }
        
        // Random user context for some logs
        if (random.nextDouble() < 0.3) { // 30% chance
            log.setUserId("user" + (random.nextInt(100) + 1));
            log.setSessionId("session-" + java.util.UUID.randomUUID().toString());
        }
        
        // Random IP address
        if (random.nextDouble() < 0.4) { // 40% chance
            log.setIpAddress(generateRandomIpAddress());
        }
        
        // Random execution time for performance logs
        if (random.nextDouble() < 0.2) { // 20% chance
            log.setExecutionTime((long) (random.nextDouble() * 5000 + 100)); // 100-5100ms
        }
        
        return log;
    }
    
    private String getRandomLevel() {
        double rand = random.nextDouble();
        if (rand < 0.6) return "INFO";
        if (rand < 0.8) return "DEBUG";
        if (rand < 0.95) return "WARN";
        return "ERROR";
    }
    
    private String getMessageForLevel(String level) {
        switch (level) {
            case "INFO":
                return infoMessages.get(random.nextInt(infoMessages.size()));
            case "WARN":
                return warnMessages.get(random.nextInt(warnMessages.size()));
            case "ERROR":
                return errorMessages.get(random.nextInt(errorMessages.size()));
            case "DEBUG":
            default:
                return "Debug information: Processing step " + (random.nextInt(10) + 1);
        }
    }
    
    private String getRandomMethodName() {
        List<String> methods = Arrays.asList(
            "processRequest", "handleRequest", "executeTask", "validateInput", 
            "saveEntity", "fetchData", "transformData", "generateResponse",
            "authenticate", "authorize", "createDocument", "updateDocument"
        );
        return methods.get(random.nextInt(methods.size()));
    }
    
    private String generateRandomIpAddress() {
        return random.nextInt(256) + "." + 
               random.nextInt(256) + "." + 
               random.nextInt(256) + "." + 
               random.nextInt(256);
    }
}