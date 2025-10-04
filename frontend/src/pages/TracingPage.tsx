import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github-dark.css';
import './tracing_page.css';

interface SystemLog {
  id: number;
  timestamp: string;
  level: string;
  logger: string;
  message: string;
  stackTrace?: string;
  threadName?: string;
  className?: string;
  methodName?: string;
  lineNumber?: number;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  executionTime?: number;
  additionalContext?: string;
}

interface ErrorAnalysis {
  summary: string;
  rootCause: string;
  suggestedSolution: string;
  relatedIssues: string[];
  severity: string;
  occurrenceCount: number;
}

interface HealthMetrics {
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
  errorRate: number;
  topErrorTypes: string[];
  problematicComponents: string[];
  overallHealth: string;
}

interface LogFilter {
  level?: string;
  logger?: string;
  searchTerm?: string;
  startTime?: string;
  endTime?: string;
  userId?: string;
}

// Mock data generator for when backend is not available
const generateMockLogs = (): SystemLog[] => {
  const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
  const loggers = [
    'com.autodocx.controller.DocumentController',
    'com.autodocx.service.DocumentService', 
    'com.autodocx.service.RewriteService',
    'org.springframework.web.servlet.DispatcherServlet',
    'org.hibernate.SQL',
    'ROOT'
  ];
  const messages = [
    'Processing document generation request for user: {}',
    'Failed to connect to external API',
    'Document saved successfully with ID: {}',
    'Authentication successful for user: {}',
    'Cache miss for key: document_{}',
    'Starting batch processing for {} documents',
    'Database connection pool exhausted',
    'Request processing completed in {}ms',
    'File upload validation failed: Invalid file type',
    'Memory usage warning: {}% of heap used'
  ];

  const mockLogs: SystemLog[] = [];
  const now = new Date();
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(now.getTime() - (i * 60000 + Math.random() * 300000));
    const level = levels[Math.floor(Math.random() * levels.length)];
    const logger = loggers[Math.floor(Math.random() * loggers.length)];
    const messageTemplate = messages[Math.floor(Math.random() * messages.length)];
    
    mockLogs.push({
      id: i + 1,
      timestamp: timestamp.toISOString(),
      level,
      logger,
      message: messageTemplate.replace('{}', Math.floor(Math.random() * 1000).toString()),
      threadName: `http-nio-8081-exec-${Math.floor(Math.random() * 10) + 1}`,
      className: logger.split('.').pop(),
      methodName: ['process', 'execute', 'handle', 'save', 'validate'][Math.floor(Math.random() * 5)],
      lineNumber: Math.floor(Math.random() * 200) + 50,
      userId: Math.random() > 0.7 ? `user_${Math.floor(Math.random() * 100)}` : undefined,
      sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
      requestId: `req_${Math.random().toString(36).substr(2, 9)}`,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      executionTime: level === 'ERROR' ? undefined : Math.floor(Math.random() * 500) + 10,
      stackTrace: level === 'ERROR' ? `java.lang.RuntimeException: Sample error\n\tat ${logger}.${['process', 'execute'][Math.floor(Math.random() * 2)]}(${logger.split('.').pop()}.java:${Math.floor(Math.random() * 100) + 50})` : undefined
    });
  }
  
  return mockLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const TracingPage: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true for initial page load
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [usingMockData, setUsingMockData] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); // For initial page load animation
  
  // Filter states
  const [filters, setFilters] = useState<LogFilter>({});
  const [quickSearch, setQuickSearch] = useState('');
  
  // Analysis states
  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysis | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [analyzingErrors, setAnalyzingErrors] = useState(false);
  
  // UI states
  const [activeTab, setActiveTab] = useState<'logs' | 'analysis' | 'health'>('logs');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [username, setUsername] = useState<string>('');
  
  const logLevels = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

  // Fetch logs from API
  const fetchLogs = useCallback(async (page = 0, size = pageSize, customFilters?: LogFilter) => {
    setLoading(true);
    setError(null);
    
    try {
      const activeFilters = customFilters || filters;
      let url = `/api/logs?page=${page}&size=${size}`;
      
      // Add filters to URL
      if (activeFilters.level && activeFilters.level !== 'ALL') {
        url += `&level=${activeFilters.level}`;
      }
      if (activeFilters.searchTerm) {
        url += `&term=${encodeURIComponent(activeFilters.searchTerm)}`;
      }
      if (activeFilters.logger) {
        url += `&logger=${encodeURIComponent(activeFilters.logger)}`;
      }
      if (activeFilters.startTime) {
        url += `&startTime=${activeFilters.startTime}`;
      }
      if (activeFilters.endTime) {
        url += `&endTime=${activeFilters.endTime}`;
      }
      if (activeFilters.userId) {
        url += `&userId=${activeFilters.userId}`;
      }
      
      // Use advanced search if filters are present
      const hasFilters = Object.values(activeFilters).some(value => value && value !== 'ALL');
      if (hasFilters) {
        url = url.replace('/api/logs?', '/api/logs/advanced-search?');
      }
      
      const response = await fetch(url);
      
      // Check if we received HTML instead of JSON (backend not available)
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType?.includes('application/json')) {
        console.warn('Backend not available, using mock data');
        const mockLogs = generateMockLogs();
        
        // Apply filters to mock data
        let filteredMockLogs = mockLogs;
        if (activeFilters.level && activeFilters.level !== 'ALL') {
          filteredMockLogs = filteredMockLogs.filter(log => log.level === activeFilters.level);
        }
        if (activeFilters.searchTerm) {
          filteredMockLogs = filteredMockLogs.filter(log => 
            log.message.toLowerCase().includes(activeFilters.searchTerm!.toLowerCase()) ||
            log.logger.toLowerCase().includes(activeFilters.searchTerm!.toLowerCase())
          );
        }
        
        // Simulate pagination
        const startIndex = page * size;
        const endIndex = startIndex + size;
        const paginatedLogs = filteredMockLogs.slice(startIndex, endIndex);
        
        setLogs(paginatedLogs);
        setFilteredLogs(paginatedLogs);
        setTotalPages(Math.ceil(filteredMockLogs.length / size));
        setCurrentPage(page);
        setUsingMockData(true);
        setError('Backend not available - showing sample data. Please start the Spring Boot application on port 8081.');
        return;
      }
      
      const data = await response.json();
      setLogs(data.content || []);
      setFilteredLogs(data.content || []);
      setTotalPages(data.totalPages || 0);
      setCurrentPage(page);
      setUsingMockData(false);
    } catch {
      console.warn('Backend not available, using mock data');
      const mockLogs = generateMockLogs();
      setLogs(mockLogs.slice(0, size));
      setFilteredLogs(mockLogs.slice(0, size));
      setTotalPages(Math.ceil(mockLogs.length / size));
      setCurrentPage(0);
      setUsingMockData(true);
      setError('Backend not available - showing sample data. Please start the Spring Boot application on port 8081.');
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize]);

  // Quick search functionality
  const performQuickSearch = useCallback((term: string) => {
    if (!term.trim()) {
      setFilteredLogs(logs);
      return;
    }
    
    const filtered = logs.filter(log =>
      log.message.toLowerCase().includes(term.toLowerCase()) ||
      log.logger.toLowerCase().includes(term.toLowerCase()) ||
      (log.className && log.className.toLowerCase().includes(term.toLowerCase()))
    );
    setFilteredLogs(filtered);
  }, [logs]);

  // Analyze errors using AI
  const analyzeErrors = async () => {
    setAnalyzingErrors(true);
    try {
      if (usingMockData) {
        // Mock analysis for demo purposes with rich markdown content
        setErrorAnalysis({
          summary: `## 🔍 Analysis Overview
          
**Critical database connectivity issues** have been detected across multiple service instances in the last 24 hours. The errors show a **consistent pattern** of connection timeouts and pool exhaustion.

### Key Metrics:
- **Error Rate**: 15 occurrences
- **Peak Times**: 14:30-16:45 UTC  
- **Affected Services**: \`user-service\`, \`order-service\`, \`payment-service\`
- **Impact**: ~23% of user requests failed

> 💡 **Quick Summary**: Database connection pool is overwhelmed during peak traffic periods, causing cascading failures across microservices.`,

          rootCause: `## 🔬 Root Cause Analysis

The investigation reveals **three primary contributing factors**:

### 1. Database Connection Pool Exhaustion 📊
- Current pool size: \`maxConnections: 10\`
- Peak concurrent requests: **~25-30**
- **Connection acquisition timeout**: 5 seconds

### 2. Long-Running Queries 🐌  
\`\`\`sql
-- Problematic query detected:
SELECT u.*, o.*, p.* FROM users u 
JOIN orders o ON u.id = o.user_id 
JOIN payments p ON o.id = p.order_id 
WHERE u.created_date > '2024-01-01'
-- Execution time: ~15-20 seconds
\`\`\`

### 3. Missing Connection Retry Logic ⚠️
- **No exponential backoff** implemented
- Failed connections are **not retried**
- Error cascades to dependent services

> ⚠️ **Root Cause**: Undersized connection pool + inefficient queries + poor error handling = system bottleneck`,

          suggestedSolution: `## ✅ Recommended Solutions

### 🚀 Immediate Actions (Priority: HIGH)

#### 1. Scale Database Connection Pool
\`\`\`yaml
# database-config.yml
database:
  connection-pool:
    maximum-pool-size: 50        # Increase from 10
    minimum-idle: 10             # Set minimum idle connections
    connection-timeout: 30000    # 30 seconds
    idle-timeout: 600000         # 10 minutes
\`\`\`

#### 2. Implement Connection Retry Logic  
\`\`\`java
// Add to service configuration
@Retryable(
    value = {SQLException.class}, 
    maxAttempts = 3,
    backoff = @Backoff(delay = 1000, multiplier = 2)
)
public Connection getConnection() {
    // Connection logic here
}
\`\`\`

#### 3. Optimize Slow Queries
- **Add database indexing** on frequently queried columns
- **Implement pagination** for large result sets  
- **Use connection pooling** with HikariCP

### 📊 Medium-term Improvements

| Solution | Timeline | Impact |
|----------|----------|---------|
| **Read Replicas** | 2-3 weeks | ⬇️ 40% load reduction |
| **Query Caching** | 1 week | ⬇️ 60% query time |
| **Circuit Breaker** | 3-4 days | 🛡️ Failure isolation |

### 🔄 Long-term Strategy
- **Database sharding** for horizontal scaling
- **Microservice async communication** patterns
- **Advanced monitoring** with real-time alerting

> 💡 **Expected Outcome**: 95% reduction in connection errors, improved response times by 300ms average.`,
          
          relatedIssues: ["Memory pressure warnings", "Slow query performance", "Timeout exceptions"],
          severity: "HIGH",
          occurrenceCount: 15
        });
        return;
      }
      
      const response = await fetch(`/api/logs/analyze-errors?searchTerm=${encodeURIComponent(quickSearch || '')}&hours=24`);
      if (response.ok) {
        const analysis = await response.json();
        setErrorAnalysis(analysis);
      }
    } catch (err) {
      console.error('Failed to analyze errors:', err);
    } finally {
      setAnalyzingErrors(false);
    }
  };

  // Fetch health metrics
  const fetchHealthMetrics = async () => {
    try {
      if (usingMockData) {
        // Mock health metrics for demo
        setHealthMetrics({
          totalErrors: 23,
          totalWarnings: 87,
          totalInfo: 456,
          errorRate: 4.1,
          topErrorTypes: ["DatabaseException", "TimeoutException", "ValidationError"],
          problematicComponents: ["DocumentController", "DatabaseService", "FileUploadService"],
          overallHealth: "WARNING"
        });
        return;
      }
      
      const response = await fetch('/api/logs/health-metrics?hours=24');
      if (response.ok) {
        const metrics = await response.json();
        setHealthMetrics(metrics);
      }
    } catch (err) {
      console.error('Failed to fetch health metrics:', err);
    }
  };

  // Fetch patterns
  const fetchPatterns = async () => {
    try {
      if (usingMockData) {
        // Mock patterns for demo with markdown formatting
        setPatterns([
          `**Database Connection Timeouts** 🔄
          
Recurring pattern every **15-20 minutes** between 14:00-16:00 UTC. Peak correlation with \`user-service\` load balancer traffic.`,

          `**Memory Pressure During Document Processing** 📊
          
Memory usage spikes to **85%+ capacity** when processing files larger than \`5MB\`. Pattern detected in \`document-processor\` service logs.`,

          `**Authentication Failures During Peak Hours** 🔐
          
**23% increase** in auth failures during 2-4 PM UTC. Correlates with:
- Redis session store timeouts  
- OAuth provider rate limiting`,

          `**Large File Upload Correlation** 📁
          
Files \`>10MB\` have **67% higher failure rate**. Error pattern:
\`\`\`
UPLOAD_TIMEOUT: Request timeout after 30s
MEMORY_EXCEEDED: Heap space exhausted
\`\`\``,

          `**Cache Invalidation Issues** ⚡
          
User session cache showing **inconsistent state** across service instances. Pattern indicates distributed cache synchronization problems.`
        ]);
        return;
      }
      
      const response = await fetch('/api/logs/patterns?hours=24');
      if (response.ok) {
        const patternData = await response.json();
        setPatterns(patternData);
      }
    } catch (err) {
      console.error('Failed to fetch patterns:', err);
    }
  };

  // Comprehensive refresh function
  const refreshAllData = useCallback(async () => {
    setLoading(true);
    setPageLoading(true);
    
    // Clear existing data
    setLogs([]);
    setFilteredLogs([]);
    setSelectedLog(null);
    setErrorAnalysis(null);
    setHealthMetrics(null);
    setPatterns([]);
    setError(null);
    
    // Fetch fresh data
    await fetchLogs();
    
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  // Initial load and auto-refresh
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs(currentPage);
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, currentPage, fetchLogs]);

  // Fetch username from localStorage
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      setUsername('User'); // Fallback if no username is stored
    }

    // Listen for changes in localStorage (e.g., when user logs in/out)
    const handleStorageChange = () => {
      const updatedUsername = localStorage.getItem('username');
      setUsername(updatedUsername || 'User');
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Poll for changes since storage event doesn't fire for same-tab changes
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Quick search effect
  useEffect(() => {
    performQuickSearch(quickSearch);
  }, [quickSearch, performQuickSearch]);

  // Apply filters
  const applyFilters = () => {
    fetchLogs(0, pageSize, filters);
    setShowFilters(false);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setQuickSearch('');
    setSelectedLevel('');
    fetchLogs(0, pageSize, {});
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get log level badge style with modern design
  const getLogLevelStyle = (level: string) => {
    const colors = {
      ERROR: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '#fca5a5' },
      WARN: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '#fbbf24' },
      INFO: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '#93c5fd' },
      DEBUG: { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: '#9ca3af' }
    };
    
    const colorSet = colors[level as keyof typeof colors] || colors.DEBUG;
    
    return {
      backgroundColor: colorSet.bg,
      color: colorSet.color,
      border: `1px solid ${colorSet.border}`,
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px'
    };
  };

  // Render log entry
  const renderLogEntry = (log: SystemLog) => (
    <div 
      key={log.id} 
      className={`log-entry ${selectedLog?.id === log.id ? 'selected' : ''}`}
      onClick={() => setSelectedLog(log)}
    >
      <div className="log-header">
        <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
        <span style={getLogLevelStyle(log.level)}>{log.level}</span>
        <span className="log-logger">{log.logger}</span>
        {log.executionTime && (
          <span className="log-execution-time">{log.executionTime}ms</span>
        )}
      </div>
      <div className="log-message">{log.message}</div>
      {log.className && (
        <div className="log-context">
          {log.className}.{log.methodName}
          {log.lineNumber && `:${log.lineNumber}`}
        </div>
      )}
    </div>
  );

  // Show loading screen for initial page load
  if (pageLoading) {
    return (
      <div className="tracing-page">
        <div className="loading">
          Loading System Tracing...
        </div>
      </div>
    );
  }

  return (
    <div className="tracing-page">
      <div className="tracing-header">
        <div className="header-top">
          <div className="header-left">
            <button 
              className="back-button"
              onClick={() => {
                window.history.back();
                // Refresh the page content when going back
                setTimeout(() => {
                  window.location.reload();
                }, 100);
              }}
              title="Back to Documentation"
            >
              ← Back
            </button>
            <h1>System Tracing & Logs</h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span>Logged in as:</span>
              <span className="username">{username || 'User'}</span>
            </div>
            <button className="change-repo-button">
              Change Repo
            </button>
          </div>
        </div>
        {usingMockData && (
          <div className="mock-data-indicator">
            ⚠️ Backend not available - showing sample data. Start the Spring Boot application on port 8081 to see real logs.
          </div>
        )}
        <div className="header-controls">
          <div className="tab-selector">
            <button 
              className={activeTab === 'logs' ? 'active' : ''} 
              onClick={() => setActiveTab('logs')}
            >
              Logs
            </button>
            <button 
              className={activeTab === 'analysis' ? 'active' : ''} 
              onClick={() => setActiveTab('analysis')}
            >
              AI Analysis
            </button>
            <button 
              className={activeTab === 'health' ? 'active' : ''} 
              onClick={() => setActiveTab('health')}
            >
              System Health
            </button>
          </div>
          
          <div className="control-buttons">
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto Refresh
            </label>
            <button onClick={() => fetchLogs(currentPage)}>Refresh</button>
          </div>
        </div>
      </div>

      {activeTab === 'logs' && (
        <div className="logs-section">
          <div className="logs-toolbar">
            <div className="toolbar-left">
              <div className="quick-search">
                <input
                  type="text"
                  placeholder="Quick search in logs..."
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
            
            <div className="toolbar-right">
              <div className="level-filter">
                <select 
                  value={selectedLevel} 
                  onChange={(e) => {
                    setSelectedLevel(e.target.value);
                    setFilters({...filters, level: e.target.value});
                    fetchLogs(0, pageSize, {...filters, level: e.target.value});
                  }}
                >
                  {logLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="filter-toggle"
              >
                Advanced Filters
              </button>
              
              <button onClick={clearFilters} className="clear-filters">
                Clear All
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="advanced-filters">
              <div className="filter-row">
                <input
                  type="text"
                  placeholder="Logger name..."
                  value={filters.logger || ''}
                  onChange={(e) => setFilters({...filters, logger: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="User ID..."
                  value={filters.userId || ''}
                  onChange={(e) => setFilters({...filters, userId: e.target.value})}
                />
                <input
                  type="datetime-local"
                  placeholder="Start time..."
                  value={filters.startTime || ''}
                  onChange={(e) => setFilters({...filters, startTime: e.target.value})}
                />
                <input
                  type="datetime-local"
                  placeholder="End time..."
                  value={filters.endTime || ''}
                  onChange={(e) => setFilters({...filters, endTime: e.target.value})}
                />
                <button onClick={applyFilters}>Apply Filters</button>
              </div>
            </div>
          )}

          <div className="logs-container">
            <div className="overview-sidebar">
              <h3>Overview</h3>
              
              <div className="overview-section">
                <h4>System Status</h4>
                <div className="overview-item">
                  <span className="overview-label">Health</span>
                  <span className="overview-value">
                    Healthy
                    <span className="overview-status status-good"></span>
                  </span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Uptime</span>
                  <span className="overview-value">12h 34m</span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Load</span>
                  <span className="overview-value">23%</span>
                </div>
              </div>

              <div className="overview-section">
                <h4>Log Summary</h4>
                <div className="overview-item">
                  <span className="overview-label">Total Logs</span>
                  <span className="overview-value">{filteredLogs.length}</span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Errors</span>
                  <span className="overview-value">
                    {filteredLogs.filter(log => log.level === 'ERROR').length}
                    <span className="overview-status status-error"></span>
                  </span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Warnings</span>
                  <span className="overview-value">
                    {filteredLogs.filter(log => log.level === 'WARN').length}
                    <span className="overview-status status-warning"></span>
                  </span>
                </div>
              </div>

              <div className="overview-section">
                <h4>Quick Filters</h4>
                <div className="quick-filters">
                  <button className="filter-chip" onClick={() => setSelectedLevel('ERROR')}>Errors Only</button>
                  <button className="filter-chip" onClick={() => setSelectedLevel('WARN')}>Warnings Only</button>
                  <button className="filter-chip" onClick={() => setSelectedLevel('INFO')}>Info Only</button>
                  <button className="filter-chip" onClick={() => setSelectedLevel('')}>All Levels</button>
                </div>
              </div>

              <div className="overview-section">
                <h4>Recent Activity</h4>
                <div className="overview-item">
                  <span className="overview-label">Last Error</span>
                  <span className="overview-value">2m ago</span>
                </div>
                <div className="overview-item">
                  <span className="overview-label">Peak Traffic</span>
                  <span className="overview-value">14:30</span>
                </div>
              </div>
            </div>

            <div className="logs-list">
              {loading && <div className="loading">Loading logs...</div>}
              {error && <div className="error">{error}</div>}
              {!loading && !error && filteredLogs.length === 0 && (
                <div className="no-logs">No logs found</div>
              )}
              {!loading && filteredLogs.map(renderLogEntry)}
            </div>

            {selectedLog && (
              <div className="log-details">
                <h3>Log Details</h3>
                <div className="detail-section">
                  <h4>Basic Information</h4>
                  <p><strong>Timestamp:</strong> {formatTimestamp(selectedLog.timestamp)}</p>
                  <p><strong>Level:</strong> <span style={getLogLevelStyle(selectedLog.level)}>{selectedLog.level}</span></p>
                  <p><strong>Logger:</strong> {selectedLog.logger}</p>
                  <p><strong>Message:</strong> {selectedLog.message}</p>
                </div>

                {selectedLog.className && (
                  <div className="detail-section">
                    <h4>Source Location</h4>
                    <p><strong>Class:</strong> {selectedLog.className}</p>
                    <p><strong>Method:</strong> {selectedLog.methodName}</p>
                    <p><strong>Line:</strong> {selectedLog.lineNumber}</p>
                  </div>
                )}

                {(selectedLog.userId || selectedLog.sessionId || selectedLog.ipAddress) && (
                  <div className="detail-section">
                    <h4>Request Context</h4>
                    {selectedLog.userId && <p><strong>User ID:</strong> {selectedLog.userId}</p>}
                    {selectedLog.sessionId && <p><strong>Session ID:</strong> {selectedLog.sessionId}</p>}
                    {selectedLog.ipAddress && <p><strong>IP Address:</strong> {selectedLog.ipAddress}</p>}
                    {selectedLog.executionTime && <p><strong>Execution Time:</strong> {selectedLog.executionTime}ms</p>}
                  </div>
                )}

                {selectedLog.stackTrace && (
                  <div className="detail-section">
                    <h4>Stack Trace</h4>
                    <pre className="stack-trace">{selectedLog.stackTrace}</pre>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pagination">
            <button 
              onClick={() => fetchLogs(currentPage - 1)} 
              disabled={currentPage <= 0}
            >
              Previous
            </button>
            <span>Page {currentPage + 1} of {totalPages}</span>
            <button 
              onClick={() => fetchLogs(currentPage + 1)} 
              disabled={currentPage >= totalPages - 1}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="analysis-section">
          <div className="analysis-toolbar">
            <button 
              onClick={analyzeErrors}
              disabled={analyzingErrors}
              className="analyze-button"
            >
              {analyzingErrors ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3"/>
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor"/>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11H1l6-6 6 6zm0 2v6a2 2 0 002 2h2a2 2 0 002-2v-6"/>
                    <path d="M13 7h8l-4-4-4 4z"/>
                  </svg>
                  Analyze Recent Errors
                </>
              )}
            </button>
            <button onClick={fetchPatterns} className="analyze-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="M21 15.5c-.7-1.3-1.4-2.5-2.1-3.7"/>
                <path d="M14.5 21c-1.3-.7-2.5-1.4-3.7-2.1"/>
              </svg>
              Detect Patterns
            </button>
          </div>

          {errorAnalysis && (
            <div className="error-analysis-enhanced">
              <div className="analysis-header">
                <div className="analysis-title">
                  <svg className="analysis-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4m-4 0V9a2 2 0 0 1 4 0v2m-4 0h4"/>
                  </svg>
                  <h3>AI-Powered Error Analysis</h3>
                </div>
                <div className="severity-badge severity-{errorAnalysis.severity.toLowerCase()}">
                  <span className="severity-dot"></span>
                  {errorAnalysis.severity} Severity
                </div>
              </div>
              
              <div className="analysis-stats">
                <div className="stat-item">
                  <span className="stat-value">{errorAnalysis.occurrenceCount}</span>
                  <span className="stat-label">Occurrences</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <span className="stat-value">AI</span>
                  <span className="stat-label">Analysis</span>
                </div>
              </div>

              <div className="analysis-content">
                <div className="analysis-section-card summary-card">
                  <div className="card-header">
                    <svg className="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    <h4>Executive Summary</h4>
                  </div>
                  <div className="card-content">
                    <div className="markdown-content">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                      >
                        {errorAnalysis.summary}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>

                <div className="analysis-section-card rootcause-card">
                  <div className="card-header">
                    <svg className="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <h4>Root Cause Analysis</h4>
                  </div>
                  <div className="card-content">
                    <div className="markdown-content">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                      >
                        {errorAnalysis.rootCause}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>

                <div className="analysis-section-card solution-card">
                  <div className="card-header">
                    <svg className="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    <h4>Recommended Solution</h4>
                  </div>
                  <div className="card-content">
                    <div className="markdown-content">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                      >
                        {errorAnalysis.suggestedSolution}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {patterns.length > 0 && (
            <div className="patterns-section-enhanced">
              <div className="patterns-header">
                <svg className="patterns-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                <h3>AI-Detected Patterns</h3>
              </div>
              <div className="patterns-grid">
                {patterns.map((pattern, index) => (
                  <div key={index} className="pattern-card">
                    <div className="pattern-indicator">
                      <span className="pattern-number">{index + 1}</span>
                    </div>
                    <div className="pattern-content">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                      >
                        {pattern}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'health' && (
        <div className="health-section">
          <div className="health-toolbar">
            <button onClick={fetchHealthMetrics} className="analyze-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12c0 1.2-4.03 6-9 6s-9-4.8-9-6c0-1.2 4.03-6 9-6s9 4.8 9 6"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Refresh Metrics
            </button>
          </div>

          <div className="health-metrics">
            <h3>System Monitor Dashboard</h3>
            
            <div className="health-summary">
              <div className={`health-status ${healthMetrics?.overallHealth.toLowerCase() || 'good'}`}>
                System Status: {healthMetrics?.overallHealth || 'Healthy'}
              </div>
            </div>

            <div className="system-monitor-grid">
              {/* CPU Usage Widget */}
              <div className="monitor-widget cpu-widget">
                <div className="widget-header">
                  <div className="widget-title">
                    CPU Usage
                  </div>
                  <div className="widget-status status-healthy">Normal</div>
                </div>
                <div className="metric-chart">
                  <div className="chart-line"></div>
                </div>
                <div className="metric-values">
                  <div className="metric-value">
                    <div className="metric-number">23%</div>
                    <div className="metric-label">Current</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">45%</div>
                    <div className="metric-label">Peak</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">18%</div>
                    <div className="metric-label">Average</div>
                  </div>
                </div>
              </div>

              {/* Memory Usage Widget */}
              <div className="monitor-widget memory-widget">
                <div className="widget-header">
                  <div className="widget-title">
                    Memory Usage
                  </div>
                  <div className="widget-status status-warning">High</div>
                </div>
                <div className="metric-chart">
                  <div className="chart-line"></div>
                </div>
                <div className="metric-values">
                  <div className="metric-value">
                    <div className="metric-number">78%</div>
                    <div className="metric-label">Current</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">92%</div>
                    <div className="metric-label">Peak</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">65%</div>
                    <div className="metric-label">Average</div>
                  </div>
                </div>
              </div>

              {/* Network Traffic Widget */}
              <div className="monitor-widget traffic-widget">
                <div className="widget-header">
                  <div className="widget-title">
                    Network Traffic
                  </div>
                  <div className="widget-status status-healthy">Stable</div>
                </div>
                <div className="metric-chart">
                  <div className="chart-line"></div>
                </div>
                <div className="metric-values">
                  <div className="metric-value">
                    <div className="metric-number">1.2MB/s</div>
                    <div className="metric-label">In</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">0.8MB/s</div>
                    <div className="metric-label">Out</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">2.1GB</div>
                    <div className="metric-label">Total</div>
                  </div>
                </div>
              </div>

              {/* Error Rate Widget */}
              <div className="monitor-widget error-widget">
                <div className="widget-header">
                  <div className="widget-title">
                    Error Rate
                  </div>
                  <div className="widget-status status-critical">Alert</div>
                </div>
                <div className="metric-chart">
                  <div className="chart-line"></div>
                </div>
                <div className="metric-values">
                  <div className="metric-value">
                    <div className="metric-number">{healthMetrics?.errorRate.toFixed(1) || '2.3'}%</div>
                    <div className="metric-label">Current</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">{healthMetrics?.totalErrors || 12}</div>
                    <div className="metric-label">Errors</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">{healthMetrics?.totalWarnings || 5}</div>
                    <div className="metric-label">Warnings</div>
                  </div>
                </div>
              </div>

              {/* Response Time Widget */}
              <div className="monitor-widget response-widget">
                <div className="widget-header">
                  <div className="widget-title">
                    Response Time
                  </div>
                  <div className="widget-status status-healthy">Fast</div>
                </div>
                <div className="metric-chart">
                  <div className="chart-line"></div>
                </div>
                <div className="metric-values">
                  <div className="metric-value">
                    <div className="metric-number">45ms</div>
                    <div className="metric-label">Current</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">120ms</div>
                    <div className="metric-label">Peak</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">38ms</div>
                    <div className="metric-label">Average</div>
                  </div>
                </div>
              </div>

              {/* Disk Usage Widget */}
              <div className="monitor-widget disk-widget">
                <div className="widget-header">
                  <div className="widget-title">
                    Disk Usage
                  </div>
                  <div className="widget-status status-warning">Medium</div>
                </div>
                <div className="metric-chart">
                  <div className="chart-line"></div>
                </div>
                <div className="metric-values">
                  <div className="metric-value">
                    <div className="metric-number">67%</div>
                    <div className="metric-label">Used</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">340GB</div>
                    <div className="metric-label">Free</div>
                  </div>
                  <div className="metric-value">
                    <div className="metric-number">1TB</div>
                    <div className="metric-label">Total</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TracingPage;