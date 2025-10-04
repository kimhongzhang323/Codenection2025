import React, { useState } from 'react'
import './ai_rewrite_panel.css'

interface AIRewritePanelProps {
  isOpen: boolean
  onClose: () => void
  selectedText: string
  onRewrite: (newText: string) => void
}

interface RewriteStyle {
  key: string
  name: string
  description: string
}

export const AIRewritePanel: React.FC<AIRewritePanelProps> = ({
  isOpen,
  onClose,
  selectedText,
  onRewrite
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'style' | 'custom' | 'improve'>('style')
  const [selectedStyle, setSelectedStyle] = useState<string>('')
  const [customInstructions, setCustomInstructions] = useState('')
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  const [availableStyles, setAvailableStyles] = useState<RewriteStyle[]>([
    { key: 'FORMAL', name: 'Formal', description: 'Professional and formal tone' },
    { key: 'CASUAL', name: 'Casual', description: 'Conversational and relaxed tone' },
    { key: 'TECHNICAL', name: 'Technical', description: 'Technical and detailed approach' },
    { key: 'CONCISE', name: 'Concise', description: 'Brief and to the point' },
    { key: 'DETAILED', name: 'Detailed', description: 'Comprehensive and thorough' },
    { key: 'CLEAR', name: 'Clear', description: 'Easy to understand and follow' }
  ])
  const [rewriteResult, setRewriteResult] = useState<string>('')

  const handleStyleRewrite = async () => {
    if (!selectedStyle || !selectedText) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/rewrite/style', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: selectedText,
          style: selectedStyle,
          additionalInstructions: additionalInstructions || undefined
        })
      })

      const data = await response.json()
      if (data.success) {
        setRewriteResult(data.result)
      } else {
        console.error('Rewrite failed:', data.error)
        alert('Failed to rewrite: ' + data.error)
      }
    } catch (error) {
      console.error('Error during rewrite:', error)
      alert('Error during rewrite: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomRewrite = async () => {
    if (!customInstructions || !selectedText) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/rewrite/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: selectedText,
          instructions: customInstructions
        })
      })

      const data = await response.json()
      if (data.success) {
        setRewriteResult(data.result)
      } else {
        console.error('Rewrite failed:', data.error)
        alert('Failed to rewrite: ' + data.error)
      }
    } catch (error) {
      console.error('Error during rewrite:', error)
      alert('Error during rewrite: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImproveContent = async () => {
    if (!selectedText) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/rewrite/improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: selectedText
        })
      })

      const data = await response.json()
      if (data.success) {
        setRewriteResult(data.result)
      } else {
        console.error('Improve failed:', data.error)
        alert('Failed to improve: ' + data.error)
      }
    } catch (error) {
      console.error('Error during improve:', error)
      alert('Error during improve: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyRewrite = () => {
    if (rewriteResult) {
      onRewrite(rewriteResult)
      setRewriteResult('')
      onClose()
    }
  }

  const handleGetSuggestions = async () => {
    if (!selectedText) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/rewrite/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: selectedText
        })
      })

      const data = await response.json()
      if (data.success) {
        setRewriteResult(data.suggestions)
      } else {
        console.error('Suggestions failed:', data.error)
        alert('Failed to get suggestions: ' + data.error)
      }
    } catch (error) {
      console.error('Error getting suggestions:', error)
      alert('Error getting suggestions: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="ai-rewrite-overlay">
      <div className="ai-rewrite-panel">
        <div className="ai-rewrite-header">
          <h3>✨ AI Rewrite Assistant</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="selected-text-preview">
          <label>Selected Text:</label>
          <div className="text-preview">
            {selectedText || 'No text selected'}
          </div>
        </div>

        <div className="rewrite-tabs">
          <button 
            className={`tab-button ${activeTab === 'style' ? 'active' : ''}`}
            onClick={() => setActiveTab('style')}
          >
            Style Rewrite
          </button>
          <button 
            className={`tab-button ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            Custom Instructions
          </button>
          <button 
            className={`tab-button ${activeTab === 'improve' ? 'active' : ''}`}
            onClick={() => setActiveTab('improve')}
          >
            Improve & Suggest
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'style' && (
            <div className="style-tab">
              <label>Choose a rewrite style:</label>
              <div className="styles-grid">
                {availableStyles.map(style => (
                  <div 
                    key={style.key}
                    className={`style-option ${selectedStyle === style.key ? 'selected' : ''}`}
                    onClick={() => setSelectedStyle(style.key)}
                  >
                    <div className="style-name">{style.name}</div>
                    <div className="style-description">{style.description}</div>
                  </div>
                ))}
              </div>
              
              <div className="additional-instructions">
                <label>Additional instructions (optional):</label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="Any specific requirements or modifications..."
                  rows={2}
                />
              </div>

              <button 
                className="action-button primary"
                onClick={handleStyleRewrite}
                disabled={!selectedStyle || !selectedText || isLoading}
              >
                {isLoading ? 'Rewriting...' : 'Rewrite with Style'}
              </button>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="custom-tab">
              <label>Custom rewrite instructions:</label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Describe how you want the text to be rewritten..."
                rows={4}
              />
              <button 
                className="action-button primary"
                onClick={handleCustomRewrite}
                disabled={!customInstructions || !selectedText || isLoading}
              >
                {isLoading ? 'Rewriting...' : 'Apply Custom Rewrite'}
              </button>
            </div>
          )}

          {activeTab === 'improve' && (
            <div className="improve-tab">
              <p>Improve grammar, clarity, and overall quality of the selected text.</p>
              <div className="improve-actions">
                <button 
                  className="action-button secondary"
                  onClick={handleImproveContent}
                  disabled={!selectedText || isLoading}
                >
                  {isLoading ? 'Improving...' : 'Improve Grammar & Clarity'}
                </button>
                <button 
                  className="action-button secondary"
                  onClick={handleGetSuggestions}
                  disabled={!selectedText || isLoading}
                >
                  {isLoading ? 'Analyzing...' : 'Get Improvement Suggestions'}
                </button>
              </div>
            </div>
          )}
        </div>

        {rewriteResult && (
          <div className="rewrite-result">
            <label>AI Result:</label>
            <div className="result-text">{rewriteResult}</div>
            <div className="result-actions">
              <button 
                className="action-button primary"
                onClick={handleApplyRewrite}
              >
                Apply Changes
              </button>
              <button 
                className="action-button secondary"
                onClick={() => setRewriteResult('')}
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}