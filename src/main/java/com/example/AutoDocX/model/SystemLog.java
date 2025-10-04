package com.example.AutoDocX.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_logs")
public class SystemLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private LocalDateTime timestamp;
    
    @Column(nullable = false)
    private String level; // DEBUG, INFO, WARN, ERROR
    
    @Column(nullable = false)
    private String logger;
    
    @Column(nullable = false, length = 2000)
    private String message;
    
    @Lob
    @Column(columnDefinition = "CLOB")
    private String stackTrace;
    
    @Column
    private String threadName;
    
    @Column
    private String className;
    
    @Column
    private String methodName;
    
    @Column
    private Integer lineNumber;
    
    @Column
    private String userId;
    
    @Column
    private String sessionId;
    
    @Column
    private String requestId;
    
    @Column
    private String ipAddress;
    
    @Column
    private String userAgent;
    
    @Column
    private Long executionTime; // in milliseconds
    
    @Column(length = 1000)
    private String additionalContext;
    
    // Constructors
    public SystemLog() {
        this.timestamp = LocalDateTime.now();
    }
    
    public SystemLog(String level, String logger, String message) {
        this();
        this.level = level;
        this.logger = logger;
        this.message = message;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    
    public String getLogger() { return logger; }
    public void setLogger(String logger) { this.logger = logger; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public String getStackTrace() { return stackTrace; }
    public void setStackTrace(String stackTrace) { this.stackTrace = stackTrace; }
    
    public String getThreadName() { return threadName; }
    public void setThreadName(String threadName) { this.threadName = threadName; }
    
    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }
    
    public String getMethodName() { return methodName; }
    public void setMethodName(String methodName) { this.methodName = methodName; }
    
    public Integer getLineNumber() { return lineNumber; }
    public void setLineNumber(Integer lineNumber) { this.lineNumber = lineNumber; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    
    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    
    public Long getExecutionTime() { return executionTime; }
    public void setExecutionTime(Long executionTime) { this.executionTime = executionTime; }
    
    public String getAdditionalContext() { return additionalContext; }
    public void setAdditionalContext(String additionalContext) { this.additionalContext = additionalContext; }
}