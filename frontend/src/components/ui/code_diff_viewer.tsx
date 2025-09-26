import React, { useState, useMemo } from 'react'
import type { CodeDiff, DiffHunk, DiffLine } from '../../types/changelog'
import { CheckIcon } from '../icons/check_icon'
import { XIcon } from '../icons/close_icon'
import './code_diff_viewer.css'

interface CodeDiffViewerProps {
  diff: CodeDiff
  showLineNumbers?: boolean
  showFileHeader?: boolean
  maxLines?: number
  onAddComment?: (file: string, line: number, content: string) => void
  className?: string
}

interface DiffStats {
  additions: number
  deletions: number
  unchanged: number
}

const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({
  diff,
  showLineNumbers = true,
  showFileHeader = true,
  maxLines,
  onAddComment,
  className = ''
}) => {
  const [expandedHunks, setExpandedHunks] = useState<Set<number>>(new Set())
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const [commentContent, setCommentContent] = useState('')
  const [showCommentDialog, setShowCommentDialog] = useState(false)

  // Calculate diff statistics
  const stats: DiffStats = useMemo(() => {
    return diff.hunks.reduce(
      (acc, hunk) => {
        hunk.lines.forEach(line => {
          switch (line.type) {
            case 'addition':
              acc.additions++
              break
            case 'deletion':
              acc.deletions++
              break
            case 'context':
              acc.unchanged++
              break
          }
        })
        return acc
      },
      { additions: 0, deletions: 0, unchanged: 0 }
    )
  }, [diff.hunks])

  // Get file extension for syntax highlighting hint
  const getFileExtension = (filename: string) => {
    const parts = filename.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
  }

  // Get status color class
  const getStatusClass = (status: CodeDiff['status']) => {
    switch (status) {
      case 'added': return 'diff-status--added'
      case 'removed': return 'diff-status--removed'
      case 'modified': return 'diff-status--modified'
      case 'renamed': return 'diff-status--renamed'
      default: return ''
    }
  }

  // Toggle hunk expansion
  const toggleHunk = (hunkIndex: number) => {
    const newExpanded = new Set(expandedHunks)
    if (newExpanded.has(hunkIndex)) {
      newExpanded.delete(hunkIndex)
    } else {
      newExpanded.add(hunkIndex)
    }
    setExpandedHunks(newExpanded)
  }

  // Handle line click for commenting
  const handleLineClick = (lineNumber: number) => {
    if (onAddComment) {
      setSelectedLine(lineNumber)
      setShowCommentDialog(true)
    }
  }

  // Handle comment submission
  const handleCommentSubmit = () => {
    if (onAddComment && selectedLine !== null && commentContent.trim()) {
      onAddComment(diff.filename, selectedLine, commentContent.trim())
      setCommentContent('')
      setShowCommentDialog(false)
      setSelectedLine(null)
    }
  }

  // Handle comment cancel
  const handleCommentCancel = () => {
    setCommentContent('')
    setShowCommentDialog(false)
    setSelectedLine(null)
  }

  // Render a single diff line
  const renderDiffLine = (line: DiffLine, lineIndex: number, hunkIndex: number) => {
    const globalLineIndex = hunkIndex * 1000 + lineIndex // Simple unique ID
    const isSelected = selectedLine === globalLineIndex
    const canComment = onAddComment && line.type !== 'deletion'

    return (
      <tr 
        key={globalLineIndex}
        className={`diff-line diff-line--${line.type} ${isSelected ? 'diff-line--selected' : ''} ${canComment ? 'diff-line--commentable' : ''}`}
        onClick={() => canComment && handleLineClick(globalLineIndex)}
      >
        {showLineNumbers && (
          <>
            <td className="diff-line__number diff-line__number--old">
              {line.oldLineNumber || ''}
            </td>
            <td className="diff-line__number diff-line__number--new">
              {line.newLineNumber || ''}
            </td>
          </>
        )}
        <td className="diff-line__marker">
          {line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '}
        </td>
        <td className="diff-line__content">
          <code>{line.content}</code>
        </td>
      </tr>
    )
  }

  // Render a diff hunk
  const renderHunk = (hunk: DiffHunk, hunkIndex: number) => {
    const isExpanded = expandedHunks.has(hunkIndex)
    const displayLines = maxLines && hunk.lines.length > maxLines 
      ? hunk.lines.slice(0, maxLines)
      : hunk.lines

    const hasMoreLines = maxLines && hunk.lines.length > maxLines

    return (
      <div key={hunkIndex} className="diff-hunk">
        <div 
          className="diff-hunk__header"
          onClick={() => toggleHunk(hunkIndex)}
        >
          <span className="diff-hunk__toggle">
            {isExpanded ? '−' : '+'}
          </span>
          <span className="diff-hunk__info">{hunk.header}</span>
          <span className="diff-hunk__stats">
            <span className="diff-stat diff-stat--additions">+{hunk.lines.filter(l => l.type === 'addition').length}</span>
            <span className="diff-stat diff-stat--deletions">−{hunk.lines.filter(l => l.type === 'deletion').length}</span>
          </span>
        </div>
        
        {isExpanded && (
          <div className="diff-hunk__content">
            <table className="diff-table">
              <tbody>
                {displayLines.map((line, lineIndex) => 
                  renderDiffLine(line, lineIndex, hunkIndex)
                )}
                {hasMoreLines && (
                  <tr className="diff-line diff-line--truncated">
                    <td colSpan={showLineNumbers ? 4 : 2} className="diff-line__content">
                      <span className="diff-truncated">
                        ... {hunk.lines.length - maxLines!} more lines
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (diff.isBinary) {
    return (
      <div className={`code-diff-viewer ${className}`}>
        {showFileHeader && (
          <div className="diff-header">
            <div className="diff-header__file">
              <span className={`diff-status ${getStatusClass(diff.status)}`}>
                {diff.status}
              </span>
              <span className="diff-filename">{diff.filename}</span>
              <span className="diff-file-type">.{getFileExtension(diff.filename)}</span>
            </div>
          </div>
        )}
        
        <div className="diff-binary">
          <div className="diff-binary__icon">📄</div>
          <p>Binary file not shown</p>
          <div className="diff-binary__actions">
            <a 
              href={diff.oldVersion.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="diff-btn diff-btn--secondary"
            >
              View Old Version
            </a>
            <a 
              href={diff.newVersion.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="diff-btn diff-btn--primary"
            >
              View New Version
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`code-diff-viewer ${className}`}>
      {showFileHeader && (
        <div className="diff-header">
          <div className="diff-header__file">
            <span className={`diff-status ${getStatusClass(diff.status)}`}>
              {diff.status}
            </span>
            <span className="diff-filename">{diff.filename}</span>
            <span className="diff-file-type">.{getFileExtension(diff.filename)}</span>
          </div>
          
          <div className="diff-header__stats">
            <span className="diff-stat diff-stat--additions">+{stats.additions}</span>
            <span className="diff-stat diff-stat--deletions">−{stats.deletions}</span>
            <span className="diff-stat diff-stat--unchanged">{stats.unchanged} unchanged</span>
          </div>
          
          <div className="diff-header__actions">
            <button 
              className="diff-btn diff-btn--icon"
              onClick={() => setExpandedHunks(new Set(diff.hunks.map((_, i) => i)))}
              title="Expand all hunks"
            >
              ⊞
            </button>
            <button 
              className="diff-btn diff-btn--icon"
              onClick={() => setExpandedHunks(new Set())}
              title="Collapse all hunks"
            >
              ⊟
            </button>
          </div>
        </div>
      )}

      <div className="diff-content">
        {diff.hunks.length === 0 ? (
          <div className="diff-empty">
            <p>No changes to display</p>
          </div>
        ) : (
          diff.hunks.map((hunk, index) => renderHunk(hunk, index))
        )}
      </div>

      {/* Comment Dialog */}
      {showCommentDialog && (
        <div className="diff-comment-overlay" onClick={handleCommentCancel}>
          <div className="diff-comment-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="diff-comment-header">
              <h3>Add Comment</h3>
              <button 
                onClick={handleCommentCancel}
                className="diff-comment-close"
              >
                <XIcon size={16} />
              </button>
            </div>
            
            <div className="diff-comment-content">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Add your comment or review feedback..."
                className="diff-comment-textarea"
                rows={4}
              />
            </div>
            
            <div className="diff-comment-actions">
              <button 
                onClick={handleCommentCancel}
                className="diff-btn diff-btn--secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleCommentSubmit}
                disabled={!commentContent.trim()}
                className="diff-btn diff-btn--primary"
              >
                <CheckIcon size={16} />
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CodeDiffViewer
