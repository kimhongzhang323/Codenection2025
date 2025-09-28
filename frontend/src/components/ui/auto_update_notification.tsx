import React, { useState } from 'react'
import type { GitHubCommit } from '../../services/api'
import './auto_update_notification.css'

interface AutoUpdateNotificationProps {
  newCommitsCount: number
  latestCommits: GitHubCommit[]
  lastUpdate: Date | null
  onRefresh: () => void
  onDismiss: () => void
  repoUrl?: string
}

const AutoUpdateNotification: React.FC<AutoUpdateNotificationProps> = ({
  newCommitsCount,
  latestCommits,
  lastUpdate,
  onRefresh,
  onDismiss,
  repoUrl
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (newCommitsCount === 0) return null

  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const truncateMessage = (message: string, maxLength: number = 60): string => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  const getCommitUrl = (commit: GitHubCommit): string => {
    if (!repoUrl) return '#'
    try {
      const url = new URL(repoUrl)
      return `${url.origin}${url.pathname}/commit/${commit.sha}`
    } catch {
      return '#'
    }
  }

  return (
    <div className="auto-update-notification">
      <div className="auto-update-header">
        <div className="auto-update-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
          </svg>
        </div>
        
        <div className="auto-update-content">
          <div className="auto-update-title">
            {newCommitsCount} new commit{newCommitsCount !== 1 ? 's' : ''} available
          </div>
          <div className="auto-update-subtitle">
            {lastUpdate && `Last updated ${formatTimeAgo(lastUpdate)}`}
          </div>
        </div>

        <div className="auto-update-actions">
          <button
            className="auto-update-expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand details'}
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <button 
            className="auto-update-refresh-btn"
            onClick={onRefresh}
            title="Refresh content"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
            </svg>
            Refresh
          </button>

          <button 
            className="auto-update-dismiss-btn"
            onClick={onDismiss}
            title="Dismiss notification"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="auto-update-details">
          <div className="commits-list">
            {latestCommits.slice(0, 5).map((commit) => (
              <div key={commit.sha} className="commit-item">
                <div className="commit-hash">
                  <a 
                    href={getCommitUrl(commit)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="commit-link"
                  >
                    {commit.sha.substring(0, 7)}
                  </a>
                </div>
                <div className="commit-message">
                  {truncateMessage(commit.commit.message.split('\n')[0])}
                </div>
                <div className="commit-author">
                  by {commit.commit.author.name}
                </div>
                <div className="commit-time">
                  {formatTimeAgo(new Date(commit.commit.author.date))}
                </div>
              </div>
            ))}
            
            {latestCommits.length > 5 && (
              <div className="commits-more">
                and {latestCommits.length - 5} more commit{latestCommits.length - 5 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AutoUpdateNotification
