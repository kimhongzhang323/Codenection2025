import { useState, useEffect, useRef } from 'react'
import './BottomMiniDialog.css'

interface BottomMiniDialogProps {
  content: string
}

interface WordCountStats {
  words: number
  characters: number
}

export function BottomMiniDialog({ content }: BottomMiniDialogProps) {
  const [stats, setStats] = useState<WordCountStats>({ words: 0, characters: 0 })
  const [showModeDialog, setShowModeDialog] = useState(false)
  const [currentMode, setCurrentMode] = useState<'reading' | 'edit'>('reading')
  const [isUpdating, setIsUpdating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Calculate word and character count
  useEffect(() => {
    if (!content) {
      setStats({ words: 0, characters: 0 })
      return
    }

    setIsUpdating(true)
    
    // Add a small delay to show the updating state
    const timer = setTimeout(() => {
      const words = content.trim().split(/\s+/).filter(word => word.length > 0).length
      const characters = content.length

      setStats({ words, characters })
      setIsUpdating(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [content])

  const formatNumber = (num: number): string => {
    return num.toLocaleString()
  }

  const handleModeChange = (mode: 'reading' | 'edit') => {
    setCurrentMode(mode)
    setShowModeDialog(false)
  }

  // Handle click outside and escape key to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModeDialog(false)
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowModeDialog(false)
      }
    }

    if (showModeDialog) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [showModeDialog])

  return (
    <div className="bottom-mini-dialog">
      <div className="bottom-mini-dialog__content">
        <div className="bottom-mini-dialog__stats">
          <div className="bottom-mini-dialog__stat">
            <span className={isUpdating ? 'bottom-mini-dialog__updating' : ''}>
              {formatNumber(stats.words)} words
            </span>
          </div>
          <div className="bottom-mini-dialog__stat">
            <span className={isUpdating ? 'bottom-mini-dialog__updating' : ''}>
              {formatNumber(stats.characters)} characters
            </span>
          </div>
        </div>
        
        <div className="bottom-mini-dialog__mode-toggle" ref={dropdownRef}>
          <button 
            className="bottom-mini-dialog__mode-button"
            onClick={() => setShowModeDialog(!showModeDialog)}
            aria-label="Toggle reading mode"
          >
            {currentMode === 'reading' ? (
              <svg className="bottom-mini-dialog__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            ) : (
              <svg className="bottom-mini-dialog__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            )}
          </button>
          
          {showModeDialog && (
            <div className="bottom-mini-dialog__mode-dropdown">
              <button 
                className={`bottom-mini-dialog__mode-option ${currentMode === 'reading' ? 'is-active' : ''}`}
                onClick={() => handleModeChange('reading')}
              >
                <svg className="bottom-mini-dialog__mode-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                <span>Reading</span>
                {currentMode === 'reading' && (
                  <svg className="bottom-mini-dialog__check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                )}
              </button>
              
              <button 
                className={`bottom-mini-dialog__mode-option ${currentMode === 'edit' ? 'is-active' : ''}`}
                onClick={() => handleModeChange('edit')}
              >
                <svg className="bottom-mini-dialog__mode-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span>Edit</span>
                {currentMode === 'edit' && (
                  <svg className="bottom-mini-dialog__check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
