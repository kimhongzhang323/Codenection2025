import React, { useState, useEffect } from 'react'
import { useTextSelection } from '../../hooks/useTextSelection'
import { XIcon } from '../icons/close_icon'
import './suggestion_panel.css'

interface SuggestionPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface Suggestion {
  id: string
  original: string
  suggested: string
  type: 'improve' | 'clarify' | 'expand' | 'simplify'
}

const SuggestionPanel: React.FC<SuggestionPanelProps> = ({ isOpen, onClose }) => {
  const { isVisible: hasSelection, selectedText, closeDialog } = useTextSelection()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Clear suggestions when panel is closed
  useEffect(() => {
    if (!isOpen) {
      setSuggestions([])
      setIsGenerating(false)
    }
  }, [isOpen])

  // Generate suggestions when text is selected
  useEffect(() => {
    if (hasSelection && selectedText.trim()) {
      generateSuggestions(selectedText)
    }
    // Don't clear suggestions when text is no longer selected
  }, [hasSelection, selectedText])

  const generateSuggestions = async (text: string) => {
    setIsGenerating(true)
    
    // Simulate AI-generated suggestions (replace with actual API call)
    setTimeout(() => {
      const mockSuggestions: Suggestion[] = [
        {
          id: '1',
          original: text,
          suggested: `${text} with improved clarity and structure.`,
          type: 'improve'
        },
        {
          id: '2', 
          original: text,
          suggested: `This section could be more specific by adding ${text.toLowerCase()} with additional context.`,
          type: 'clarify'
        }
      ]
      setSuggestions(mockSuggestions)
      setIsGenerating(false)
    }, 1000)
  }

  const handleApprove = (suggestion: Suggestion) => {
    // Replace the selected text with the suggestion
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(document.createTextNode(suggestion.suggested))
    }
    closeDialog()
    setSuggestions([])
  }

  const handleReject = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId))
  }

  const handleRetry = (suggestionId: string) => {
    // Regenerate suggestion for this specific item
    const suggestion = suggestions.find(s => s.id === suggestionId)
    if (suggestion) {
      generateSuggestions(suggestion.original)
    }
  }


  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'improve':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        )
      case 'clarify':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" x2="12.01" y1="17" y2="17"/>
          </svg>
        )
      case 'expand':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
            <line x1="12" x2="12" y1="22.08" y2="12"/>
          </svg>
        )
      case 'simplify':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        )
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"/>
            <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
          </svg>
        )
    }
  }


  if (!isOpen) return null

  return (
    <div className="suggestion-panel">
      <div className="suggestion-panel-header">
        <h3 className="suggestion-panel-title">Smart Suggestions</h3>
        <button 
          className="suggestion-panel-close"
          onClick={onClose}
          aria-label="Close suggestions"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="suggestion-panel-content">
        {!hasSelection && suggestions.length === 0 ? (
          <div className="suggestion-panel-empty">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"/>
              <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
            </svg>
            <h4>Select text to get suggestions</h4>
            <p>Highlight any text on the page to see AI-powered improvement suggestions</p>
          </div>
        ) : hasSelection ? (
          <div className="suggestion-panel-selection">
            <div className="suggestion-panel-selection-header">
              <h4>Selected Text</h4>
              <span className="suggestion-panel-selection-count">{selectedText.length} characters</span>
            </div>
            <div className="suggestion-panel-selection-text">
              "{selectedText}"
            </div>
          </div>
        ) : null}

        {isGenerating && (
          <div className="suggestion-panel-loading">
            <div className="suggestion-panel-loading-spinner"></div>
            <p>Generating suggestions...</p>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="suggestion-panel-suggestions">
            <h4>Suggestions</h4>
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="suggestion-item">
                <div className="suggestion-item-header">
                  <div className="suggestion-item-icon">
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <div className="suggestion-item-type">
                    {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                  </div>
                  <button 
                    className="suggestion-item-reject"
                    onClick={() => handleReject(suggestion.id)}
                    aria-label="Reject suggestion"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div className="suggestion-item-content">
                  <div className="suggestion-item-suggested">
                    {suggestion.suggested}
                  </div>
                </div>
                <div className="suggestion-item-actions">
                  <button 
                    className="suggestion-item-retry"
                    onClick={() => handleRetry(suggestion.id)}
                  >
                    Retry
                  </button>
                  <button 
                    className="suggestion-item-approve"
                    onClick={() => handleApprove(suggestion)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                    Insert
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SuggestionPanel
