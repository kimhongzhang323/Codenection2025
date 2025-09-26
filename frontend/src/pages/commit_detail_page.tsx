import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow, prism } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import type { ChangelogEntry, FileChange } from '../types/changelog'
import { changelogApi } from '../services/api'
import './commit_detail_page.css'

// Icons
const ArrowLeftIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

const CopyIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)

const ExternalLinkIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15,3 21,3 21,9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
)

const FileIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14,2 14,8 20,8" />
  </svg>
)

interface CommitDetailPageProps {
  className?: string
}

const CommitDetailPage: React.FC<CommitDetailPageProps> = () => {
  const { sha } = useParams<{ sha: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [commit, setCommit] = useState<ChangelogEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedSha, setCopiedSha] = useState(false)

  // Get language for syntax highlighting
  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop() || ''
    const languageAliases: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c++': 'cpp',
      'cxx': 'cpp',
      'cc': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'hxx': 'cpp',
      'cs': 'csharp',
      'fs': 'fsharp',
      'vb': 'vbnet',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'scala': 'scala',
      'dart': 'dart',
      'html': 'html',
      'htm': 'html',
      'xml': 'xml',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'cfg': 'ini',
      'conf': 'ini',
      'properties': 'properties',
      'sh': 'bash',
      'bash': 'bash',
      'ps1': 'powershell',
      'bat': 'batch',
      'cmd': 'batch',
      'sql': 'sql',
      'dockerfile': 'dockerfile',
      'md': 'markdown',
      'tex': 'latex',
      'r': 'r',
      'pl': 'perl',
      'lua': 'lua',
      'vim': 'vim',
      'diff': 'diff',
      'log': 'log',
      'txt': 'text'
    }
    return languageAliases[ext] || 'diff'
  }

  // Get theme based on current theme preference
  const getTheme = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches
    return isDark ? tomorrow : prism
  }

  // Get repository info from location state or localStorage
  const repoUrl = location.state?.repoUrl || localStorage.getItem('current_repo_url')
  const repoName = location.state?.repoName || localStorage.getItem('current_repo_name')

  useEffect(() => {
    const loadCommitDetails = async () => {
      if (!sha || !repoUrl) {
        setError('Missing commit SHA or repository URL')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        const commitData = await changelogApi.getCommit(repoUrl, sha)
        
        // Convert to ChangelogEntry format
        const entry: ChangelogEntry = {
          id: commitData.sha,
          commit: {
            sha: commitData.sha,
            message: commitData.commit.message,
            author: commitData.commit.author,
            committer: commitData.commit.committer,
            url: commitData.url,
            html_url: commitData.html_url,
            stats: commitData.stats
          },
          files: (commitData.files || []).map(file => ({
            filename: file.filename,
            status: file.status as 'added' | 'removed' | 'modified' | 'renamed',
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            blob_url: `https://github.com/${repoName}/blob/${commitData.sha}/${file.filename}`,
            raw_url: `https://raw.githubusercontent.com/${repoName}/${commitData.sha}/${file.filename}`,
            contents_url: `https://api.github.com/repos/${repoName}/contents/${file.filename}?ref=${commitData.sha}`,
            patch: file.patch
          })),
          message: commitData.commit.message,
          author: commitData.commit.author.name,
          date: commitData.commit.author.date,
          sha: commitData.sha,
          branch: 'main',
          tags: [],
          filesChanged: commitData.files?.length || 0,
          linesAdded: commitData.stats?.additions || 0,
          linesDeleted: commitData.stats?.deletions || 0
        }
        
        setCommit(entry)
      } catch (err) {
        console.error('Error loading commit details:', err)
        setError(err instanceof Error ? err.message : 'Failed to load commit details')
      } finally {
        setIsLoading(false)
      }
    }

    loadCommitDetails()
  }, [sha, repoUrl, repoName])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSha(true)
      setTimeout(() => setCopiedSha(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case 'added': return '#22c55e'
      case 'removed': return '#ef4444'
      case 'modified': return '#f59e0b'
      case 'renamed': return '#8b5cf6'
      default: return 'var(--docs-normal-text)'
    }
  }

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return '+'
      case 'removed': return '-'
      case 'modified': return '~'
      case 'renamed': return '→'
      default: return '•'
    }
  }

  if (isLoading) {
    return (
      <div className="commit-detail-page">
        <div className="commit-detail-loading">
          <div className="loading-spinner"></div>
          <p>Loading commit details...</p>
        </div>
      </div>
    )
  }

  if (error || !commit) {
    return (
      <div className="commit-detail-page">
        <div className="commit-detail-header">
          <button onClick={() => navigate(-1)} className="back-button">
            <ArrowLeftIcon size={20} />
            Back
          </button>
        </div>
        <div className="commit-detail-error">
          <h2>Error Loading Commit</h2>
          <p>{error || 'Commit not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="commit-detail-page">
      {/* Header */}
      <div className="commit-detail-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <ArrowLeftIcon size={20} />
          Back to Changelog
        </button>
        <div className="commit-detail-actions">
          <a 
            href={commit.commit.html_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="external-link-button"
          >
            <ExternalLinkIcon size={16} />
            View on GitHub
          </a>
        </div>
      </div>

      {/* Commit Info */}
      <div className="commit-detail-info">
        <div className="commit-message">
          <h1>{commit.message.split('\n')[0]}</h1>
          {commit.message.split('\n').length > 1 && (
            <div className="commit-description">
              {commit.message.split('\n').slice(1).join('\n').trim()}
            </div>
          )}
        </div>

        <div className="commit-metadata">
          <div className="commit-author">
            <div className="author-avatar">
              {commit.author.charAt(0).toUpperCase()}
            </div>
            <div className="author-info">
              <div className="author-name">{commit.author}</div>
              <div className="commit-date">{formatDate(commit.date)}</div>
            </div>
          </div>

          <div className="commit-sha">
            <span className="sha-label">Commit</span>
            <div className="sha-container">
              <code className="sha-value">{commit.sha.slice(0, 7)}</code>
              <button 
                onClick={() => copyToClipboard(commit.sha)}
                className="copy-button"
                title={copiedSha ? 'Copied!' : 'Copy full SHA'}
              >
                <CopyIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="commit-stats">
          <div className="stat-item files">
            <span className="stat-number">{commit.filesChanged}</span>
            <span className="stat-label">file{commit.filesChanged !== 1 ? 's' : ''} changed</span>
          </div>
          <div className="stat-item additions">
            <span className="stat-number">+{commit.linesAdded}</span>
            <span className="stat-label">additions</span>
          </div>
          <div className="stat-item deletions">
            <span className="stat-number">-{commit.linesDeleted}</span>
            <span className="stat-label">deletions</span>
          </div>
        </div>
      </div>

      {/* Files Changed */}
      <div className="commit-files">
        <h2 className="files-title">
          <FileIcon size={20} />
          Files Changed ({commit.filesChanged})
        </h2>
        
        {commit.files && commit.files.length > 0 ? (
          <div className="files-list">
            {commit.files.map((file: FileChange, index: number) => (
              <div key={index} className="file-item">
                <div className="file-header">
                  <div className="file-status" style={{ color: getFileStatusColor(file.status) }}>
                    <span className="status-icon">{getFileStatusIcon(file.status)}</span>
                    <span className="status-text">{file.status}</span>
                  </div>
                  <div className="file-path">
                    <code>{file.filename}</code>
                  </div>
                  <div className="file-stats">
                    {file.additions > 0 && (
                      <span className="file-additions">+{file.additions}</span>
                    )}
                    {file.deletions > 0 && (
                      <span className="file-deletions">-{file.deletions}</span>
                    )}
                  </div>
                </div>
                
                {file.patch && (
                  <div className="file-patch">
                    <SyntaxHighlighter
                      language={getLanguageFromFilename(file.filename)}
                      style={getTheme()}
                      customStyle={{
                        margin: 0,
                        padding: '16px',
                        background: 'var(--background)',
                        fontSize: '13px',
                        lineHeight: 1.4,
                        borderRadius: '0 0 8px 8px',
                        fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
                      }}
                      showLineNumbers={true}
                      wrapLines={false}
                      wrapLongLines={false}
                      lineNumberStyle={{
                        minWidth: '3rem',
                        padding: '0 0.5rem 0 0.25rem',
                        marginRight: '0.5rem',
                        textAlign: 'right',
                        userSelect: 'none',
                        opacity: 0.6,
                        borderRight: '1px solid var(--border)',
                      }}
                    >
                      {file.patch}
                    </SyntaxHighlighter>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-files">
            <p>No file changes detected for this commit.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CommitDetailPage
