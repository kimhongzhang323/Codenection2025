import React, { useState, useRef, useEffect } from 'react'
import TldrButton from './tldr_button'
import TldrPanel from './tldr_panel'
import './tools_dropdown.css'

interface ToolsDropdownProps {
  githubHref: string
  pageContent?: string
  // Translation props
  isTranslationActive: boolean
  currentLanguageCode: string
  onOpenTranslation: () => void
  // Smart suggestions props
  onToggleSuggestions: () => void
  // Auto-update props
  isMonitoring: boolean
  newCommitsCount: number
  onToggleAutoUpdate: () => void
  // GitHub bot props
  isGitHubBotEnabled: boolean
  onToggleGitHubBot: () => void
  // Discord props
  isDiscordMonitoringActive: boolean
  onOpenDiscordConfig: () => void
  // AI Assistant props
  onToggleAIChat: () => void
}

const ToolsDropdown: React.FC<ToolsDropdownProps> = ({ 
  githubHref, 
  pageContent,
  isTranslationActive,
  currentLanguageCode,
  onOpenTranslation,
  onToggleSuggestions,
  isMonitoring,
  newCommitsCount,
  onToggleAutoUpdate,
  isGitHubBotEnabled,
  onToggleGitHubBot,
  isDiscordMonitoringActive,
  onOpenDiscordConfig,
  onToggleAIChat
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isTldrOpen, setIsTldrOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div className="tools-dropdown-container" ref={dropdownRef}>
      {/* Compact square button */}
      <button 
        className={`tools-dropdown-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open tools menu"
        title="Documentation Tools"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      </button>

      {/* Expanded tools menu - expands upward */}
      {isOpen && (
        <div className="tools-dropdown-menu">
          {/* Translation Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 0 } as React.CSSProperties}>
            <button 
              className={`tools-dropdown-tool ${isTranslationActive ? 'active' : ''}`}
              onClick={() => {
                onOpenTranslation()
                setIsOpen(false)
              }}
              title="Change Language"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 8l6 6"/>
                <path d="M4 14l6-6 2-3"/>
                <path d="M2 5h12"/>
                <path d="M7 2h1"/>
                <path d="M22 22l-5-10-5 10"/>
                <path d="M14 18h6"/>
              </svg>
              <span className="tools-dropdown-label">Translation ({currentLanguageCode})</span>
              <span className="tools-dropdown-tooltip">Change Language</span>
            </button>
          </div>

          {/* Smart Suggestions Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 1 } as React.CSSProperties}>
            <button 
              className="tools-dropdown-tool"
              onClick={() => {
                onToggleSuggestions()
                setIsOpen(false)
              }}
              title="Smart Suggestions"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="tools-dropdown-label">Smart Suggestions</span>
              <span className="tools-dropdown-tooltip">Get AI-powered suggestions</span>
            </button>
          </div>

          {/* Auto-Update Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 2 } as React.CSSProperties}>
            <button 
              className={`tools-dropdown-tool ${isMonitoring ? 'active' : ''}`}
              onClick={() => {
                onToggleAutoUpdate()
                setIsOpen(false)
              }}
              title={isMonitoring ? 'Disable Auto-Update' : 'Enable Auto-Update'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
              </svg>
              <span className="tools-dropdown-label">Auto-Update {isMonitoring ? '(ON)' : '(OFF)'}</span>
              <span className="tools-dropdown-tooltip">
                Auto-Update {isMonitoring ? '(ON)' : '(OFF)'} 
                {newCommitsCount > 0 && ` - ${newCommitsCount} new`}
              </span>
            </button>
          </div>

          {/* GitHub Bot Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 3 } as React.CSSProperties}>
            <button 
              className={`tools-dropdown-tool ${isGitHubBotEnabled ? 'active' : ''}`}
              onClick={() => {
                onToggleGitHubBot()
                setIsOpen(false)
              }}
              title={isGitHubBotEnabled ? 'Disable GitHub Bot' : 'Enable GitHub Bot'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              <span className="tools-dropdown-label">GitHub Bot {isGitHubBotEnabled ? '(ON)' : '(OFF)'}</span>
              <span className="tools-dropdown-tooltip">GitHub Bot {isGitHubBotEnabled ? '(ON)' : '(OFF)'}</span>
            </button>
          </div>

          {/* Discord Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 4 } as React.CSSProperties}>
            <button 
              className={`tools-dropdown-tool ${isDiscordMonitoringActive ? 'active' : ''}`}
              onClick={() => {
                onOpenDiscordConfig()
                setIsOpen(false)
              }}
              title="Discord Notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
              </svg>
              <span className="tools-dropdown-label">Discord {isDiscordMonitoringActive ? '(Active)' : ''}</span>
              <span className="tools-dropdown-tooltip">Discord {isDiscordMonitoringActive ? '(Active)' : ''}</span>
            </button>
          </div>

          {/* AI Assistant Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 5 } as React.CSSProperties}>
            <button 
              className="tools-dropdown-tool"
              onClick={() => {
                onToggleAIChat()
                setIsOpen(false)
              }}
              title="AI Assistant"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              <span className="tools-dropdown-label">AI Assistant</span>
              <span className="tools-dropdown-tooltip">AI Assistant</span>
            </button>
          </div>

          {/* TL;DR / Summarize Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 6 } as React.CSSProperties}>
            <div className="tools-dropdown-tool-wrapper" onClick={() => {
              setIsTldrOpen(true)
              setIsOpen(false)
            }}>
              <TldrButton 
                onClick={() => {
                  setIsTldrOpen(true)
                  setIsOpen(false)
                }}
              />
              <span className="tools-dropdown-label">TL;DR Summary</span>
              <span className="tools-dropdown-tooltip">Generate AI-powered summary</span>
            </div>
          </div>
          
          {/* Copy URL Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 7 } as React.CSSProperties}>
            <button 
              className="tools-dropdown-tool"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href)
                setIsOpen(false)
              }}
              title="Copy Page URL"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span className="tools-dropdown-label">Copy URL</span>
              <span className="tools-dropdown-tooltip">Copy URL</span>
            </button>
          </div>

          {/* Print Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 8 } as React.CSSProperties}>
            <button 
              className="tools-dropdown-tool"
              onClick={() => {
                window.print()
                setIsOpen(false)
              }}
              title="Print Page"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6,9 6,2 18,2 18,9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              <span className="tools-dropdown-label">Print</span>
              <span className="tools-dropdown-tooltip">Print</span>
            </button>
          </div>

          {/* Export Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 9 } as React.CSSProperties}>
            <button 
              className="tools-dropdown-tool"
              onClick={() => {
                // Export as markdown or PDF
                const content = document.querySelector('.docs-content')?.textContent || 'No content found'
                const blob = new Blob([content], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'documentation.txt'
                a.click()
                URL.revokeObjectURL(url)
                setIsOpen(false)
              }}
              title="Export Content"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span className="tools-dropdown-label">Export</span>
              <span className="tools-dropdown-tooltip">Export</span>
            </button>
          </div>
        </div>
      )}
      
      {/* TL;DR Panel */}
      <TldrPanel
        repoUrl={githubHref !== '#' ? githubHref : undefined}
        pageContent={pageContent}
        isOpen={isTldrOpen}
        onClose={() => setIsTldrOpen(false)}
      />
    </div>
  )
}

export default ToolsDropdown
