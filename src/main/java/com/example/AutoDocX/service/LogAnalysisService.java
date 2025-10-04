package com.example.AutoDocX.service;

import com.example.AutoDocX.model.SystemLog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LogAnalysisService {
    
    @Autowired
    private SummarizerService summarizerService;
    
    /**
     * AI-powered error analysis and summarization
     */
    public class ErrorAnalysis {
        private String summary;
        private String rootCause;
        private String suggestedSolution;
        private List<String> relatedIssues;
        private String severity;
        private int occurrenceCount;
        
        // Constructors, getters and setters
        public ErrorAnalysis() {}
        
        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }
        
        public String getRootCause() { return rootCause; }
        public void setRootCause(String rootCause) { this.rootCause = rootCause; }
        
        public String getSuggestedSolution() { return suggestedSolution; }
        public void setSuggestedSolution(String suggestedSolution) { this.suggestedSolution = suggestedSolution; }
        
        public List<String> getRelatedIssues() { return relatedIssues; }
        public void setRelatedIssues(List<String> relatedIssues) { this.relatedIssues = relatedIssues; }
        
        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }
        
        public int getOccurrenceCount() { return occurrenceCount; }
        public void setOccurrenceCount(int occurrenceCount) { this.occurrenceCount = occurrenceCount; }
    }
    
    /**
     * System health metrics
     */
    public class HealthMetrics {
        private int totalErrors;
        private int totalWarnings;
        private int totalInfo;
        private double errorRate;
        private List<String> topErrorTypes;
        private List<String> problematicComponents;
        private String overallHealth;
        
        // Constructors, getters and setters
        public HealthMetrics() {}
        
        public int getTotalErrors() { return totalErrors; }
        public void setTotalErrors(int totalErrors) { this.totalErrors = totalErrors; }
        
        public int getTotalWarnings() { return totalWarnings; }
        public void setTotalWarnings(int totalWarnings) { this.totalWarnings = totalWarnings; }
        
        public int getTotalInfo() { return totalInfo; }
        public void setTotalInfo(int totalInfo) { this.totalInfo = totalInfo; }
        
        public double getErrorRate() { return errorRate; }
        public void setErrorRate(double errorRate) { this.errorRate = errorRate; }
        
        public List<String> getTopErrorTypes() { return topErrorTypes; }
        public void setTopErrorTypes(List<String> topErrorTypes) { this.topErrorTypes = topErrorTypes; }
        
        public List<String> getProblematicComponents() { return problematicComponents; }
        public void setProblematicComponents(List<String> problematicComponents) { this.problematicComponents = problematicComponents; }
        
        public String getOverallHealth() { return overallHealth; }
        public void setOverallHealth(String overallHealth) { this.overallHealth = overallHealth; }
    }
    
    /**
     * Analyze error logs and provide AI-powered insights
     */
    public ErrorAnalysis analyzeError(List<SystemLog> errorLogs) {
        if (errorLogs.isEmpty()) {
            return new ErrorAnalysis();
        }
        
        ErrorAnalysis analysis = new ErrorAnalysis();
        
        // Count occurrences
        analysis.setOccurrenceCount(errorLogs.size());
        
        // Build comprehensive error context
        StringBuilder contextBuilder = new StringBuilder();
        contextBuilder.append("Error Analysis Request:\n");
        contextBuilder.append("Number of similar errors: ").append(errorLogs.size()).append("\n\n");
        
        // Add sample error messages
        contextBuilder.append("Sample Error Messages:\n");
        errorLogs.stream()
                .limit(5)
                .forEach(log -> {
                    contextBuilder.append("- [").append(log.getTimestamp()).append("] ")
                                 .append(log.getMessage()).append("\n");
                });
        
        // Add stack traces if available
        String firstStackTrace = errorLogs.stream()
                .filter(log -> log.getStackTrace() != null)
                .findFirst()
                .map(SystemLog::getStackTrace)
                .orElse(null);
        
        if (firstStackTrace != null) {
            contextBuilder.append("\nStack Trace:\n").append(firstStackTrace).append("\n");
        }
        
        // Add context information
        contextBuilder.append("\nContext Information:\n");
        contextBuilder.append("Affected Components: ");
        Set<String> components = errorLogs.stream()
                .map(SystemLog::getLogger)
                .collect(Collectors.toSet());
        contextBuilder.append(String.join(", ", components)).append("\n");
        
        contextBuilder.append("Time Range: ");
        LocalDateTime earliest = errorLogs.stream()
                .min(Comparator.comparing(SystemLog::getTimestamp))
                .map(SystemLog::getTimestamp)
                .orElse(LocalDateTime.now());
        LocalDateTime latest = errorLogs.stream()
                .max(Comparator.comparing(SystemLog::getTimestamp))
                .map(SystemLog::getTimestamp)
                .orElse(LocalDateTime.now());
        contextBuilder.append(earliest).append(" to ").append(latest).append("\n");
        
        // Request AI analysis
        String prompt = contextBuilder.toString() + 
                "\nPlease provide:\n" +
                "1. A concise summary of what went wrong\n" +
                "2. The most likely root cause\n" +
                "3. Suggested solution or fix\n" +
                "4. Any related issues to watch for\n" +
                "5. Severity assessment (LOW/MEDIUM/HIGH/CRITICAL)";
        
        try {
            String aiResponse = summarizerService.summarize(prompt);
            parseAIResponse(aiResponse, analysis);
        } catch (Exception e) {
            // Fallback analysis
            analysis.setSummary("Multiple errors detected in " + String.join(", ", components));
            analysis.setRootCause("Analysis failed - manual review required");
            analysis.setSuggestedSolution("Please review error logs manually");
            analysis.setSeverity(errorLogs.size() > 10 ? "HIGH" : "MEDIUM");
        }
        
        return analysis;
    }
    
    /**
     * Parse AI response and extract structured information
     */
    private void parseAIResponse(String response, ErrorAnalysis analysis) {
        String[] lines = response.split("\n");
        StringBuilder currentSection = new StringBuilder();
        String currentType = "";
        
        for (String line : lines) {
            line = line.trim();
            if (line.toLowerCase().contains("summary") || line.contains("1.")) {
                currentType = "summary";
                currentSection = new StringBuilder();
            } else if (line.toLowerCase().contains("root cause") || line.contains("2.")) {
                if (currentType.equals("summary")) {
                    analysis.setSummary(currentSection.toString().trim());
                }
                currentType = "rootcause";
                currentSection = new StringBuilder();
            } else if (line.toLowerCase().contains("solution") || line.toLowerCase().contains("fix") || line.contains("3.")) {
                if (currentType.equals("rootcause")) {
                    analysis.setRootCause(currentSection.toString().trim());
                }
                currentType = "solution";
                currentSection = new StringBuilder();
            } else if (line.toLowerCase().contains("related") || line.contains("4.")) {
                if (currentType.equals("solution")) {
                    analysis.setSuggestedSolution(currentSection.toString().trim());
                }
                currentType = "related";
                currentSection = new StringBuilder();
            } else if (line.toLowerCase().contains("severity") || line.contains("5.")) {
                if (currentType.equals("related")) {
                    analysis.setRelatedIssues(Arrays.asList(currentSection.toString().split("\n")));
                }
                currentType = "severity";
                currentSection = new StringBuilder();
            } else {
                currentSection.append(line).append(" ");
            }
        }
        
        // Handle last section
        switch (currentType) {
            case "summary":
                analysis.setSummary(currentSection.toString().trim());
                break;
            case "rootcause":
                analysis.setRootCause(currentSection.toString().trim());
                break;
            case "solution":
                analysis.setSuggestedSolution(currentSection.toString().trim());
                break;
            case "related":
                analysis.setRelatedIssues(Arrays.asList(currentSection.toString().split("\n")));
                break;
            case "severity":
                String severityText = currentSection.toString().trim().toUpperCase();
                if (severityText.contains("CRITICAL")) analysis.setSeverity("CRITICAL");
                else if (severityText.contains("HIGH")) analysis.setSeverity("HIGH");
                else if (severityText.contains("MEDIUM")) analysis.setSeverity("MEDIUM");
                else if (severityText.contains("LOW")) analysis.setSeverity("LOW");
                else analysis.setSeverity("MEDIUM");
                break;
        }
    }
    
    /**
     * Generate system health metrics
     */
    public HealthMetrics generateHealthMetrics(List<SystemLog> logs) {
        HealthMetrics metrics = new HealthMetrics();
        
        // Count by level
        Map<String, Long> levelCounts = logs.stream()
                .collect(Collectors.groupingBy(SystemLog::getLevel, Collectors.counting()));
        
        metrics.setTotalErrors(levelCounts.getOrDefault("ERROR", 0L).intValue());
        metrics.setTotalWarnings(levelCounts.getOrDefault("WARN", 0L).intValue());
        metrics.setTotalInfo(levelCounts.getOrDefault("INFO", 0L).intValue());
        
        // Calculate error rate
        int totalLogs = logs.size();
        if (totalLogs > 0) {
            metrics.setErrorRate((double) metrics.getTotalErrors() / totalLogs * 100);
        }
        
        // Find top error types
        metrics.setTopErrorTypes(
            logs.stream()
                .filter(log -> "ERROR".equals(log.getLevel()))
                .collect(Collectors.groupingBy(SystemLog::getLogger, Collectors.counting()))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList())
        );
        
        // Find problematic components
        metrics.setProblematicComponents(
            logs.stream()
                .filter(log -> "ERROR".equals(log.getLevel()) || "WARN".equals(log.getLevel()))
                .collect(Collectors.groupingBy(SystemLog::getLogger, Collectors.counting()))
                .entrySet()
                .stream()
                .filter(entry -> entry.getValue() > 5)
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(Map.Entry::getKey)
                .collect(Collectors.toList())
        );
        
        // Assess overall health
        if (metrics.getErrorRate() > 20) {
            metrics.setOverallHealth("CRITICAL");
        } else if (metrics.getErrorRate() > 10) {
            metrics.setOverallHealth("POOR");
        } else if (metrics.getErrorRate() > 5) {
            metrics.setOverallHealth("FAIR");
        } else {
            metrics.setOverallHealth("GOOD");
        }
        
        return metrics;
    }
    
    /**
     * Detect patterns in log messages
     */
    public List<String> detectPatterns(List<SystemLog> logs) {
        List<String> patterns = new ArrayList<>();
        
        // Group by similar messages
        Map<String, Long> messageCounts = logs.stream()
                .map(log -> normalizeMessage(log.getMessage()))
                .collect(Collectors.groupingBy(msg -> msg, Collectors.counting()));
        
        // Find recurring patterns
        messageCounts.entrySet().stream()
                .filter(entry -> entry.getValue() > 3)
                .forEach(entry -> {
                    patterns.add("Recurring issue: '" + entry.getKey() + "' occurred " + 
                               entry.getValue() + " times");
                });
        
        return patterns;
    }
    
    private String normalizeMessage(String message) {
        // Remove dynamic parts like timestamps, IDs, etc.
        return message.replaceAll("\\d+", "X")
                     .replaceAll("\\b\\w{8}-\\w{4}-\\w{4}-\\w{4}-\\w{12}\\b", "UUID")
                     .replaceAll("\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b", "IP");
    }
}