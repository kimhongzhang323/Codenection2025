import React, { useState, useRef, useEffect } from 'react'
import { TldrIcon } from '../icons/tldr_icon'
import type { TldrIconHandle } from '../icons/tldr_icon'
import { agentApi } from '../../services/api'
import Markdown from '../markdown'
import './summarize_button.css'
import './summarize_panel.css'

interface SummarizeButtonProps {
  repoUrl?: string
  pageContent?: string
}

const SummarizeButton: React.FC<SummarizeButtonProps> = ({ repoUrl, pageContent }) => {
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [summary, setSummary] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('master')
  const [branches, setBranches] = useState<string[]>(['master'])
  const iconRef = useRef<TldrIconHandle>(null)

  const handleMouseEnter = () => {
    if (!isSummarizing && iconRef.current) {
      iconRef.current.startAnimation()
    }
  }

  const handleMouseLeave = () => {
    if (!isSummarizing && iconRef.current) {
      iconRef.current.stopAnimation()
    }
  }

  // Fetch available branches for the repository
  const fetchBranches = async (gitUrl: string) => {
    try {
      // Extract owner and repo name from GitHub URL
      const urlMatch = gitUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!urlMatch) return;
      
      const [, owner, repo] = urlMatch;
      const repoName = repo.replace('.git', '');
      
      // Fetch branches from GitHub API
      const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/branches`);
      if (response.ok) {
        const branchData = await response.json();
        const branchNames = branchData.map((branch: { name: string }) => branch.name);
        setBranches(branchNames);
        
        // Set default branch (prefer 'main' if available, otherwise 'master')
        if (branchNames.includes('main')) {
          setSelectedBranch('main');
        } else if (branchNames.includes('master')) {
          setSelectedBranch('master');
        } else {
          setSelectedBranch(branchNames[0] || 'master');
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      // Keep default values
    }
  };

  // Fetch branches when repository URL changes
  useEffect(() => {
    if (repoUrl && repoUrl !== '#') {
      fetchBranches(repoUrl);
    }
  }, [repoUrl]);

  async function handleSummarize() {
    if (isSummarizing) return
    
    if (!repoUrl || repoUrl === '#') {
      console.warn('No repository URL available for summarization')
      return
    }

    setIsSummarizing(true)
    setSummary('')
    setIsPanelOpen(true)
    
    try {
      // Call the backend summary agent API with selected branch and page content
      const summaryResult = await agentApi.runSummary(repoUrl, selectedBranch, pageContent)
      setSummary(summaryResult)
    } catch (error) {
      console.error('Error generating summary:', error)
      setSummary(`### Error
      
Failed to generate summary. Please try again later.

**Error Details:**
${error instanceof Error ? error.message : 'Unknown error occurred'}`)
    } finally {
      setIsSummarizing(false)
    }
  }

  // Close panel with ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPanelOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleSummarize}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={isSummarizing}
        aria-label="Summarize for TL;DR"
        title="Summarize for TL;DR"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px 6px 10px',
          borderRadius: 8,
          border: '1px solid var(--bottom-dialog-border)',
          background: isSummarizing ? 'var(--search-input-bg)' : 'var(--search-input-bg)',
          color: 'var(--docs-normal-text)',
          fontSize: 12,
          cursor: isSummarizing ? 'not-allowed' : 'pointer',
          outline: 'none',
          opacity: isSummarizing ? 0.7 : 1
        }}
      >
        <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transform: isSummarizing ? 'translateY(-0.5px)' : 'translateY(1.5px)' }}>
          {isSummarizing ? (
            <div 
              style={{
                width: 12,
                height: 12,
                border: '2px solid var(--docs-normal-text)',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
          ) : (
            <TldrIcon ref={iconRef} size={16} />
          )}
        </span>
        <span>{isSummarizing ? 'Summarizing...' : 'Summarize'}</span>
      </button>
      
      {/* Slide-in TL;DR panel */}
      <div className={`tldr-panel ${isPanelOpen ? 'is-open' : ''} ${isFullScreen ? 'is-fullscreen' : ''}`} role="dialog" aria-modal="true">
        {/* Top bar: controls only */}
        <div className="tldr-panel__topbar">
          <div className="tldr-panel__actions">
            {/* Collapse/back (chevrons) */}
            <button className="tldr-icon-btn" onClick={() => setIsPanelOpen(false)} aria-label="Collapse panel">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 7 18 12 13 17"/>
                <polyline points="6 7 11 12 6 17"/>
              </svg>
            </button>
            {/* Fullscreen/restore */}
            <button className="tldr-icon-btn" onClick={() => setIsFullScreen(v => !v)} aria-label="Toggle full screen">
              {isFullScreen ? (
                // restore icon (smaller)
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 14 4 14 4 19"/>
                  <polyline points="15 10 20 10 20 5"/>
                  <polyline points="4 9 4 4 9 4"/>
                  <polyline points="20 15 20 20 15 20"/>
                </svg>
              ) : (
                // expand icon (smaller)
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/>
                  <polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/>
                  <line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* Title header below top bar */}
        <div className="tldr-panel__titlebar" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          paddingRight: '12px',
          minHeight: '40px',
          paddingTop: '8px',
          paddingBottom: '8px'
        }}>
          <h2 className="tldr-panel__title">TL;DR</h2>
          {/* Branch selection */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '13px',
            opacity: 0.9
          }}>
            <span>Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              disabled={isSummarizing}
              style={{
                background: 'var(--search-input-bg)',
                border: '1px solid var(--bottom-dialog-border)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                color: 'var(--docs-normal-text)',
                minWidth: '90px',
                height: '26px',
                cursor: isSummarizing ? 'not-allowed' : 'pointer'
              }}
            >
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="tldr-panel__content">
          {isSummarizing ? (
            <>
              <div style={{ 
                fontSize: '12px', 
                opacity: 0.7, 
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                Generating summary for branch: <strong>{selectedBranch}</strong>
              </div>
              <div className="tldr-skeleton">
                <div className="tldr-skel-line" style={{ width: '85%' }} />
                <div className="tldr-skel-line" style={{ width: '96%' }} />
                <div className="tldr-skel-line" style={{ width: '72%' }} />
                <div className="tldr-skel-line" style={{ width: '90%' }} />
                <div className="tldr-skel-line" style={{ width: '64%' }} />
                <div className="tldr-skel-line" style={{ width: '93%' }} />
                <div className="tldr-skel-line" style={{ width: '78%' }} />
                <div className="tldr-skel-line" style={{ width: '88%' }} />
                <div className="tldr-skel-line" style={{ width: '70%' }} />
                <div className="tldr-skel-line" style={{ width: '40%' }} />
                <div className="tldr-skel-line" style={{ width: '92%' }} />
                <div className="tldr-skel-line" style={{ width: '68%' }} />
                <div className="tldr-skel-line" style={{ width: '82%' }} />
                <div className="tldr-skel-line" style={{ width: '58%' }} />
                <div className="tldr-skel-line" style={{ width: '87%' }} />
                <div className="tldr-skel-line" style={{ width: '73%' }} />
                <div className="tldr-skel-line" style={{ width: '85%' }} />
                <div className="tldr-skel-line" style={{ width: '96%' }} />
                <div className="tldr-skel-line" style={{ width: '72%' }} />
                <div className="tldr-skel-line" style={{ width: '90%' }} />
                <div className="tldr-skel-line" style={{ width: '64%' }} />
                <div className="tldr-skel-line" style={{ width: '93%' }} />
                <div className="tldr-skel-line" style={{ width: '78%' }} />
              </div>
            </>
          ) : summary ? (
            <>
              <div style={{ 
                fontSize: '12px', 
                opacity: 0.7, 
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Summary for branch: <strong>{selectedBranch}</strong></span>
                <button
                  onClick={handleSummarize}
                  style={{
                    background: 'var(--search-input-bg)',
                    border: '1px solid var(--bottom-dialog-border)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '14px',
                    color: 'var(--docs-normal-text)',
                    cursor: 'pointer',
                    opacity: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                  title="Regenerate summary"
                >
                  🔄 <span style={{ fontSize: '11px' }}>Refresh</span>
                </button>
              </div>
              <div 
                style={{ 
                  fontSize: '14px', 
                  lineHeight: '1.6'
                }}
              >
                <Markdown content={summary} />
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: 0, opacity: 0.9 }}>Your summary will appear here.</p>
              <p style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>Select a branch above and click the TL;DR button to generate an AI-powered summary.</p>
            </>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default SummarizeButton
