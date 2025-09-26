import React, { useState, useEffect } from 'react'
import { agentApi } from '../../services/api'
import Markdown from '../markdown'
import './tldr_panel.css'

interface TldrPanelProps {
  repoUrl?: string
  pageContent?: string
  isOpen: boolean
  onClose: () => void
}

const TldrPanel: React.FC<TldrPanelProps> = ({ repoUrl, pageContent, isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('master')
  const [branches, setBranches] = useState<string[]>(['master', 'main', 'develop'])
  const [error, setError] = useState('')

  // Fetch available branches for the repository
  const fetchBranches = async (gitUrl: string) => {
    try {
      const urlMatch = gitUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!urlMatch) return;
      
      const [, owner, repo] = urlMatch;
      const repoName = repo.replace('.git', '');
      
      const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/branches`);
      if (response.ok) {
        const branchData = await response.json();
        const branchNames = branchData.map((branch: { name: string }) => branch.name);
        setBranches(branchNames);
        
        // Set default branch
        if (branchNames.includes('main')) {
          setSelectedBranch('main');
        } else if (branchNames.includes('master')) {
          setSelectedBranch('master');
        } else if (branchNames.length > 0) {
          setSelectedBranch(branchNames[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  // Generate summary
  const generateSummary = async () => {
    if (!repoUrl) {
      setError('Repository URL is required');
      return;
    }

    setIsLoading(true);
    setError('');
    setSummary('');
    
    try {
      console.log('[TldrPanel] Generating summary for:', { repoUrl, selectedBranch });
      const result = await agentApi.runSummary(repoUrl, selectedBranch, pageContent);
      setSummary(result);
    } catch (error) {
      console.error('[TldrPanel] Error generating summary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate summary when panel opens
  useEffect(() => {
    if (isOpen && repoUrl && !summary && !isLoading) {
      if (repoUrl.includes('github.com')) {
        fetchBranches(repoUrl);
      }
      generateSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, repoUrl, selectedBranch]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="tldr-backdrop" onClick={onClose} />
      
      {/* Panel */}
      <div className="tldr-panel-new">
        {/* Header */}
        <div className="tldr-header">
          <div className="tldr-title">
            <h2>📝 TL;DR Summary</h2>
            <span className="tldr-subtitle">AI-powered repository summary</span>
          </div>
          <button className="tldr-close-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Branch Selection */}
        <div className="tldr-branch-section">
          <label htmlFor="branch-select">Branch:</label>
          <select
            id="branch-select"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={isLoading}
            className="tldr-branch-select"
          >
            {branches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
          <button 
            className="tldr-refresh-btn"
            onClick={generateSummary}
            disabled={isLoading}
            title="Regenerate summary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="tldr-content">
          {isLoading ? (
            <div className="tldr-loading">
              <div className="tldr-spinner"></div>
              <p>Analyzing repository and generating summary...</p>
              <div className="tldr-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          ) : error ? (
            <div className="tldr-error">
              <div className="tldr-error-icon">⚠️</div>
              <h3>Failed to Generate Summary</h3>
              <p>{error}</p>
              <button onClick={generateSummary} className="tldr-retry-btn">
                Try Again
              </button>
            </div>
          ) : summary ? (
            <div className="tldr-summary">
              <div className="tldr-summary-header">
                <span className="tldr-branch-indicator">Branch: {selectedBranch}</span>
                <span className="tldr-generated-time">Generated just now</span>
              </div>
              <div className="tldr-markdown-content">
                <Markdown content={summary} />
              </div>
            </div>
          ) : (
            <div className="tldr-empty">
              <div className="tldr-empty-icon">📋</div>
              <h3>Ready to Generate Summary</h3>
              <p>Click the refresh button to generate an AI-powered summary of this repository.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TldrPanel;
