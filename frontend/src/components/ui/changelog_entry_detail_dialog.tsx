import React, { useState, useEffect } from 'react'
import type { ChangelogEntry, CodeDiff, ReviewComment } from '../../types/changelog'
import { XIcon } from '../icons/close_icon'
import { GithubIcon } from '../icons/github_icon'
import { ArrowRightIcon } from '../icons/arrow_icon'
import { CheckIcon } from '../icons/check_icon'
import './changelog_entry_detail_dialog.css'
import { SparklesIcon } from '../icons/sparkles_icon'
import CodeDiffViewer from './code_diff_viewer'
import './changelog_entry_detail_dialog.css'

interface ChangelogEntryDetailDialogProps {
  entry: ChangelogEntry
  isOpen: boolean
  onClose: () => void
  onAddComment?: (comment: ReviewComment) => void
  className?: string
}

const ChangelogEntryDetailDialog: React.FC<ChangelogEntryDetailDialogProps> = ({
  entry,
  isOpen,
  onClose,
  onAddComment,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'diff' | 'review'>('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [diffs, setDiffs] = useState<CodeDiff[]>([])
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [newComment, setNewComment] = useState('')

  // Load diff data when dialog opens
  useEffect(() => {
    if (isOpen && activeTab === 'diff') {
      setIsLoading(true)
      // TODO: Replace with actual API call
      // const loadDiffs = async () => {
      //   const result = await changelogApi.getCommitDiffs(entry.sha)
      //   setDiffs(result)
      // }
      
      // Mock diff data for development
      const mockDiff: CodeDiff = {
        filename: 'src/auth/jwt.ts',
        oldVersion: {
          content: 'const generateToken = (user) => {\n  return jwt.sign(user, secret)\n}',
          sha: entry.sha.slice(0, 7),
          url: `https://github.com/repo/blob/${entry.sha.slice(0, 7)}/src/auth/jwt.ts`
        },
        newVersion: {
          content: 'const generateToken = (user: User) => {\n  return jwt.sign(user, secret, { expiresIn: "24h" })\n}',
          sha: entry.sha,
          url: `https://github.com/repo/blob/${entry.sha}/src/auth/jwt.ts`
        },
        hunks: [
          {
            oldStart: 1,
            oldLines: 3,
            newStart: 1,
            newLines: 3,
            header: '@@ -1,3 +1,3 @@',
            lines: [
              { type: 'deletion', content: 'const generateToken = (user) => {', oldLineNumber: 1 },
              { type: 'addition', content: 'const generateToken = (user: User) => {', newLineNumber: 1 },
              { type: 'deletion', content: '  return jwt.sign(user, secret)', oldLineNumber: 2 },
              { type: 'addition', content: '  return jwt.sign(user, secret, { expiresIn: "24h" })', newLineNumber: 2 },
              { type: 'context', content: '}', oldLineNumber: 3, newLineNumber: 3 }
            ]
          }
        ],
        status: 'modified',
        additions: 2,
        deletions: 2,
        isBinary: false
      }
      
      // Mock loading delay
      setTimeout(() => {
        setDiffs([mockDiff])
        setIsLoading(false)
      }, 500)
    }
  }, [isOpen, activeTab, entry.sha])

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get author initials
  const getAuthorInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Handle comment submission
  const handleCommentSubmit = (file?: string, line?: number, content?: string) => {
    const commentText = content || newComment
    if (commentText.trim() && onAddComment) {
      const comment: ReviewComment = {
        id: `comment-${Date.now()}`,
        user: 'Current User', // TODO: Get from auth context
        content: commentText.trim(),
        timestamp: new Date().toISOString(),
        file,
        line,
        type: file ? 'line-specific' : 'general'
      }
      
      onAddComment(comment)
      setComments(prev => [...prev, comment])
      setNewComment('')
    }
  }

  // Handle file selection for diff view
  const handleFileSelect = () => {
    setActiveTab('diff')
  }

  if (!isOpen) return null

  return (
    <div className={`changelog-detail-overlay ${className}`} onClick={onClose}>
      <div className="changelog-detail-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Dialog Header */}
        <div className="changelog-detail-header">
          <div className="changelog-detail-title">
            <div className="changelog-detail-avatar">
              {getAuthorInitials(entry.author)}
            </div>
            <div>
              <h2 className="changelog-detail-message">{entry.message}</h2>
              <div className="changelog-detail-meta">
                <span className="changelog-detail-author">{entry.author}</span>
                <span className="changelog-detail-date">{formatDate(entry.date)}</span>
                <span className="changelog-detail-sha">{entry.sha.slice(0, 7)}</span>
              </div>
            </div>
          </div>
          
          <div className="changelog-detail-actions">
            <a 
              href={entry.commit.html_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="changelog-btn changelog-btn--secondary"
            >
              <GithubIcon size={16} />
              View on GitHub
            </a>
            <button onClick={onClose} className="changelog-detail-close">
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {/* Dialog Tabs */}
        <div className="changelog-detail-tabs">
          <button 
            className={`changelog-tab ${activeTab === 'overview' ? 'changelog-tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`changelog-tab ${activeTab === 'files' ? 'changelog-tab--active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            Files ({entry.filesChanged})
          </button>
          <button 
            className={`changelog-tab ${activeTab === 'diff' ? 'changelog-tab--active' : ''}`}
            onClick={() => setActiveTab('diff')}
          >
            Code Changes
          </button>
          <button 
            className={`changelog-tab ${activeTab === 'review' ? 'changelog-tab--active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            Review ({comments.length})
          </button>
        </div>

        {/* Dialog Content */}
        <div className="changelog-detail-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="changelog-overview">
              <div className="changelog-overview-stats">
                <div className="changelog-stat-card">
                  <div className="changelog-stat-value">{entry.filesChanged}</div>
                  <div className="changelog-stat-label">Files Changed</div>
                </div>
                <div className="changelog-stat-card changelog-stat-card--positive">
                  <div className="changelog-stat-value">+{entry.linesAdded}</div>
                  <div className="changelog-stat-label">Lines Added</div>
                </div>
                <div className="changelog-stat-card changelog-stat-card--negative">
                  <div className="changelog-stat-value">-{entry.linesDeleted}</div>
                  <div className="changelog-stat-label">Lines Deleted</div>
                </div>
              </div>

              <div className="changelog-overview-details">
                <div className="changelog-detail-section">
                  <h3>Commit Information</h3>
                  <div className="changelog-info-grid">
                    <div className="changelog-info-item">
                      <label>SHA:</label>
                      <span className="changelog-sha-full">{entry.sha}</span>
                    </div>
                    <div className="changelog-info-item">
                      <label>Branch:</label>
                      <span>{entry.branch}</span>
                    </div>
                    <div className="changelog-info-item">
                      <label>Author:</label>
                      <span>{entry.author}</span>
                    </div>
                    <div className="changelog-info-item">
                      <label>Date:</label>
                      <span>{formatDate(entry.date)}</span>
                    </div>
                  </div>
                </div>

                {entry.tags.length > 0 && (
                  <div className="changelog-detail-section">
                    <h3>Tags</h3>
                    <div className="changelog-tags">
                      {entry.tags.map(tag => (
                        <span key={tag} className={`changelog-tag changelog-tag--${tag}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="changelog-detail-section">
                  <h3>Commit Message</h3>
                  <div className="changelog-commit-message">
                    {entry.message}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="changelog-files">
              <div className="changelog-files-header">
                <h3>Changed Files</h3>
                <div className="changelog-files-stats">
                  <span className="changelog-files-count">{entry.filesChanged} files</span>
                  <span className="changelog-stat changelog-stat--additions">+{entry.linesAdded}</span>
                  <span className="changelog-stat changelog-stat--deletions">-{entry.linesDeleted}</span>
                </div>
              </div>
              
              <div className="changelog-files-list">
                {/* Mock file list */}
                {[
                  { name: 'src/auth/jwt.ts', additions: 45, deletions: 12, status: 'modified' },
                  { name: 'src/components/Login.tsx', additions: 32, deletions: 8, status: 'modified' },
                  { name: 'src/utils/validation.ts', additions: 28, deletions: 0, status: 'added' },
                  { name: 'tests/auth.test.ts', additions: 15, deletions: 25, status: 'modified' }
                ].map((file) => (
                  <div 
                    key={file.name} 
                    className="changelog-file-item"
                    onClick={handleFileSelect}
                  >
                    <div className="changelog-file-info">
                      <span className={`changelog-file-status changelog-file-status--${file.status}`}>
                        {file.status === 'added' ? '+' : file.status === 'removed' ? '−' : '±'}
                      </span>
                      <span className="changelog-file-name">{file.name}</span>
                    </div>
                    <div className="changelog-file-stats">
                      <span className="changelog-stat changelog-stat--additions">+{file.additions}</span>
                      <span className="changelog-stat changelog-stat--deletions">-{file.deletions}</span>
                      <ArrowRightIcon size={16} className="changelog-file-arrow" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code Changes Tab */}
          {activeTab === 'diff' && (
            <div className="changelog-diff">
              {isLoading ? (
                <div className="changelog-loading">
                  <div className="changelog-spinner"></div>
                  <p>Loading code changes...</p>
                </div>
              ) : diffs.length === 0 ? (
                <div className="changelog-empty">
                  <p>No code changes to display</p>
                </div>
              ) : (
                <div className="changelog-diff-container">
                  {diffs.map((diff, index) => (
                    <CodeDiffViewer
                      key={`${diff.filename}-${index}`}
                      diff={diff}
                      onAddComment={handleCommentSubmit}
                      showLineNumbers={true}
                      showFileHeader={true}
                      maxLines={50}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Review Tab */}
          {activeTab === 'review' && (
            <div className="changelog-review">
              <div className="changelog-review-header">
                <h3>Code Review</h3>
                <div className="changelog-review-actions">
                  <button className="changelog-btn changelog-btn--success">
                    <CheckIcon size={16} />
                    Approve
                  </button>
                  <button className="changelog-btn changelog-btn--primary">
                    <SparklesIcon size={16} />
                    AI Review
                  </button>
                </div>
              </div>

              <div className="changelog-review-content">
                {/* Add General Comment */}
                <div className="changelog-comment-form">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a general comment about this commit..."
                    className="changelog-comment-textarea"
                    rows={3}
                  />
                  <div className="changelog-comment-actions">
                    <button 
                      onClick={() => handleCommentSubmit()}
                      disabled={!newComment.trim()}
                      className="changelog-btn changelog-btn--primary"
                    >
                      Add Comment
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="changelog-comments">
                  {comments.length === 0 ? (
                    <div className="changelog-comments-empty">
                      <p>No review comments yet. Add one above or click on code lines to comment.</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="changelog-comment">
                        <div className="changelog-comment-header">
                          <div className="changelog-comment-author">
                            <div className="changelog-comment-avatar">
                              {getAuthorInitials(comment.user)}
                            </div>
                            <span>{comment.user}</span>
                          </div>
                          <div className="changelog-comment-meta">
                            {comment.file && (
                              <span className="changelog-comment-file">
                                {comment.file}:{comment.line}
                              </span>
                            )}
                            <span className="changelog-comment-time">
                              {formatDate(comment.timestamp)}
                            </span>
                          </div>
                        </div>
                        <div className="changelog-comment-content">
                          {comment.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChangelogEntryDetailDialog
