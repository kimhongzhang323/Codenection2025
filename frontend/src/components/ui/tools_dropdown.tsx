import React, { useState, useRef, useEffect } from 'react'
import './tools_dropdown.css'

interface ToolsDropdownProps {
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
  // AI Chat props (optional)
  isAIChatEnabled?: boolean
  onToggleAIChat?: () => void
}

const ToolsDropdown: React.FC<ToolsDropdownProps> = ({ 
  onToggleSuggestions,
  isMonitoring,
  newCommitsCount,
  onToggleAutoUpdate,
  isGitHubBotEnabled,
  onToggleGitHubBot,
  isDiscordMonitoringActive,
  onOpenDiscordConfig
  ,isAIChatEnabled, onToggleAIChat
}) => {
  const [isOpen, setIsOpen] = useState(false)
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
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round"
          className={`tools-icon ${isOpen ? 'rotated' : ''}`}
        >
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Expanded tools menu - expands upward */}
      {isOpen && (
        <div className="tools-dropdown-menu">
          {/* Smart Suggestions Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 0 } as React.CSSProperties}>
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
          <div className="tools-dropdown-item" style={{ '--item-index': 1 } as React.CSSProperties}>
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
          <div className="tools-dropdown-item" style={{ '--item-index': 2 } as React.CSSProperties}>
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
          <div className="tools-dropdown-item" style={{ '--item-index': 3 } as React.CSSProperties}>
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

          {/* AI Chat Tool */}
          <div className="tools-dropdown-item" style={{ '--item-index': 4 } as React.CSSProperties}>
            <button
              className={`tools-dropdown-tool ${isAIChatEnabled ? 'active' : ''}`}
              onClick={() => {
                onToggleAIChat && onToggleAIChat()
                setIsOpen(false)
              }}
              title="AI Chat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="tools-dropdown-label">AI Chat {isAIChatEnabled ? '(ON)' : '(OFF)'}</span>
              <span className="tools-dropdown-tooltip">Toggle AI Chat assistant</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ToolsDropdown
