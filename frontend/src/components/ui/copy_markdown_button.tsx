import React, { useState } from 'react'
import './copy_markdown_button.css'

interface CopyMarkdownButtonProps {
  content: string
}

const CopyMarkdownButton: React.FC<CopyMarkdownButtonProps> = ({ content }) => {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      console.log('[CopyMarkdownButton] Copying content:', content?.substring(0, 100) + '...')
      
      if (!content || content.trim() === '') {
        console.warn('[CopyMarkdownButton] No content to copy')
        return
      }
      
      await navigator.clipboard.writeText(content)
      setCopied(true)
      console.log('[CopyMarkdownButton] Content copied successfully')
      window.setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('[CopyMarkdownButton] Failed to copy content:', error)
      // Try fallback method
      try {
        const textArea = document.createElement('textarea')
        textArea.value = content
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
        console.log('[CopyMarkdownButton] Content copied using fallback method')
      } catch (fallbackError) {
        console.error('[CopyMarkdownButton] Fallback copy method also failed:', fallbackError)
      }
    }
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy Markdown"
      title="Copy Markdown"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px 6px 10px',
        borderRadius: 8,
        border: '1px solid var(--bottom-dialog-border)',
        background: 'var(--search-input-bg)',
        color: 'var(--docs-normal-text)',
        fontSize: 12,
        cursor: 'pointer',
        outline: 'none'
      }}
    >
      <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {copied ? (
          <img src="/check.svg" alt="Copied" width={16} height={16} className="copy-markdown-button__icon" />
        ) : (
          <img src="/copy_markdown.svg" alt="Copy" width={16} height={16} className="copy-markdown-button__icon" />
        )}
      </span>
      <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
    </button>
  )
}

export default CopyMarkdownButton


