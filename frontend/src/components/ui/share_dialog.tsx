import { useState, useEffect } from 'react'
import './share_dialog.css'
import { XIcon } from '../icons/close_icon'

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  documentUrl?: string
}

export default function ShareDialog({ isOpen, onClose, documentUrl }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState('')
  const [accessLevel, setAccessLevel] = useState<'restricted' | 'public'>('restricted')
  const [inviteText, setInviteText] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setShareUrl(documentUrl || window.location.href)
  }, [documentUrl])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="share-dialog-overlay" onClick={handleOverlayClick}>
      <div className="share-dialog">
        {/* Header */}
        <div className="share-dialog__header">
          <h2 className="share-dialog__title">Share "Codenection2025"</h2>
          <button className="share-dialog__close-btn" onClick={onClose} title="Close">
            <XIcon size={20} />
          </button>
        </div>

        {/* Invite Input */}
        <div className="share-dialog__invite-section">
          <input
            type="text"
            className="share-dialog__invite-input"
            placeholder="Add people, groups, spaces, and calendar events"
            value={inviteText}
            onChange={(e) => setInviteText(e.target.value)}
          />
        </div>

        {/* People with access */}
        <div className="share-dialog__access-section">
          <h3 className="share-dialog__section-title">People with access</h3>
          
          {/* Owner */}
          <div className="share-dialog__access-item">
            <div className="share-dialog__access-avatar">
              <div className="share-dialog__user-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </div>
            <div className="share-dialog__access-info">
              <div className="share-dialog__access-name">Anonymous User</div>
            </div>
            <div className="share-dialog__access-role">Owner</div>
          </div>
        </div>

        {/* General access */}
        <div className="share-dialog__general-section">
          <h3 className="share-dialog__section-title">General access</h3>
          
          <div className="share-dialog__general-item">
            <div className={`share-dialog__general-icon ${accessLevel === 'public' ? 'share-dialog__general-icon--public' : ''}`}>
              {accessLevel === 'restricted' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              )}
            </div>
            <div className="share-dialog__general-content">
              <div className="share-dialog__general-dropdown">
                <button 
                  className="share-dialog__dropdown-btn"
                  onClick={() => setAccessLevel(accessLevel === 'restricted' ? 'public' : 'restricted')}
                >
                  <span>{accessLevel === 'restricted' ? 'Restricted' : 'Public'}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              </div>
              <div className="share-dialog__general-description">
                {accessLevel === 'restricted' 
                  ? 'Only people with access can open with the link'
                  : 'Anyone with the link can view'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="share-dialog__footer">
          <button 
            className="share-dialog__copy-btn"
            onClick={handleCopyLink}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button className="share-dialog__done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}