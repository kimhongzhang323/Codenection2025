import React, { useState, useRef } from 'react'
import { TldrIcon } from '../icons/tldr_icon'
import type { TldrIconHandle } from '../icons/tldr_icon'
import './summarize_button.css'

interface SummarizeButtonProps {
  content: string
}

const SummarizeButton: React.FC<SummarizeButtonProps> = ({ content: _content }) => {
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
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
    try {
      // Call the AI chat context to generate a summary
      const { useAIChat } = await import('../../contexts/AIChatContext')
      const { openChat } = useAIChat()
      
      // Open AI chat
      openChat()
      
      // For now, we'll show a simple message that the summary request was sent
      setSummary('Summary request sent to AI chat')
      setShowSummary(true)
      
      // Hide the summary message after 3 seconds
      setTimeout(() => {
        setShowSummary(false)
        setSummary(null)
      }, 3000)
      
    } catch (error) {
      console.error('Error generating summary:', error)
      setSummary('Error generating summary')
      setShowSummary(true)
      setTimeout(() => {
        setShowSummary(false)
        setSummary(null)
      }, 3000)
    } finally {
      setIsSummarizing(false)
    }
  }

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
        <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(1.5px)' }}>
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
      
      {showSummary && summary && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 8,
            padding: '8px 12px',
            background: 'var(--search-input-bg)',
            border: '1px solid var(--bottom-dialog-border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--docs-normal-text)',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          {summary}
        </div>
      )}
      
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
