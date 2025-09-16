import React, { useState } from 'react'
import './copy_markdown_button.css'

interface CopyMarkdownButtonProps {
  content: string
}

const CopyMarkdownButton: React.FC<CopyMarkdownButtonProps> = ({ content }) => {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {}
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


