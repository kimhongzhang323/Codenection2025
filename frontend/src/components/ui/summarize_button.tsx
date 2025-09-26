import React, { useState, useRef, useEffect } from 'react'
import { TldrIcon } from '../icons/tldr_icon'
import type { TldrIconHandle } from '../icons/tldr_icon'
import './summarize_button.css'
import './summarize_panel.css'

interface SummarizeButtonProps {
  content: string
}

const SummarizeButton: React.FC<SummarizeButtonProps> = ({ content: _content }) => {
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
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

  async function handleSummarize() {
    if (isSummarizing) return
    setIsSummarizing(true)
    // Slide in our TL;DR panel; actual summarization can be wired later
    setIsPanelOpen(true)
    // Simulate generation time; in real integration, set to false when AI completes
    setTimeout(() => setIsSummarizing(false), 2500)
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
        <div className="tldr-panel__titlebar">
          <h2 className="tldr-panel__title">TL;DR</h2>
        </div>
        <div className="tldr-panel__content">
          {isSummarizing ? (
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
          ) : (
            <>
              <p style={{ margin: 0, opacity: 0.9 }}>Your summary will appear here.</p>
              <p style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>Coming soon: AI-generated TL;DR of the selected or current section.</p>
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
