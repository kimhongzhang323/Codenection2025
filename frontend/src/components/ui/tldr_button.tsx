import React from 'react'
import './tldr_button.css'

interface TldrButtonProps {
  onClick: () => void
  disabled?: boolean
}

const TldrButton: React.FC<TldrButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Generate TL;DR"
      title="Generate TL;DR Summary"
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
        outline: 'none',
        opacity: disabled ? 0.5 : 1
      }}
    >
      <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      </span>
      <span>TL;DR</span>
    </button>
  )
}

export default TldrButton
