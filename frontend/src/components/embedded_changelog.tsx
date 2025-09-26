import React, { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SearchIcon } from './icons/search_icon'
import { HistoryIcon } from './icons/history_icon'
import type { 
  ChangelogEntry, 
  ChangelogFilter
} from '../types/changelog'
import type { GitHubCommit } from '../services/api'
import { changelogApi } from '../services/api'
import '../pages/changelog_page.css'

interface EmbeddedChangelogProps {
  repoUrl?: string
  repo?: string
  className?: string
}

const EmbeddedChangelog: React.FC<EmbeddedChangelogProps> = ({ 
  repoUrl, 
  repo, 
  className = '' 
}) => {
  const location = useLocation() as { state?: { repoUrl?: string; repoData?: { name?: string; fullName?: string } } }
  const navigate = useNavigate()
  
  // State management
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Filters
  const [filters] = useState<ChangelogFilter>({
    searchQuery: '',
    author: '',
    dateFrom: '',
    dateTo: '',
    fileExtension: '',
    branch: 'main'
  })

  const [, setAuthors] = useState<string[]>([])

  const effectiveRepoUrl = repoUrl || location.state?.repoUrl || (
    repo && repo.includes('/') ? `https://github.com/${repo}` : null
  )

  // Get effective repo from URL
  const effectiveRepo = effectiveRepoUrl ? 
    effectiveRepoUrl.replace('https://github.com/', '') : 
    (repo || '')

  // Convert GitHub commit to ChangelogEntry
  const convertGitHubCommitToEntry = useCallback((commit: GitHubCommit): ChangelogEntry => {
    const filesChanged = commit.files?.length || 0
    const additions = commit.stats?.additions || 0
    const deletions = commit.stats?.deletions || 0

    return {
      id: commit.sha,
      commit: {
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.committer.email,
          date: commit.commit.committer.date
        },
        url: commit.url,
        html_url: commit.html_url,
        stats: {
          additions,
          deletions,
          total: additions + deletions
        }
      },
      files: commit.files?.map((file) => ({
        filename: file.filename,
        status: file.status as 'added' | 'modified' | 'removed' | 'renamed',
        additions: file.additions || 0,
        deletions: file.deletions || 0,
        changes: file.changes || 0,
        blob_url: '',
        raw_url: '',
        contents_url: '',
        patch: file.patch || ''
      })) || [],
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      sha: commit.sha,
      branch: 'main',
      tags: [],
      filesChanged,
      linesAdded: additions,
      linesDeleted: deletions
    }
  }, [])

  // Load changelog entries
  const loadEntries = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!effectiveRepoUrl) {
      setError('Repository URL not available')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const commits = await changelogApi.getCommits(effectiveRepoUrl, filters.branch || 'main', page)
      const newEntries = commits.map(convertGitHubCommitToEntry)

      if (append) {
        setEntries(prev => [...prev, ...newEntries])
      } else {
        setEntries(newEntries)
        // Extract unique authors
        const uniqueAuthors = Array.from(new Set(newEntries.map(entry => entry.author)))
        setAuthors(uniqueAuthors)
      }

      setHasMore(newEntries.length === 30) // Assuming 30 per page
      setCurrentPage(page)
    } catch (err) {
      console.error('Failed to load changelog:', err)
      setError(err instanceof Error ? err.message : 'Failed to load changelog')
    } finally {
      setIsLoading(false)
    }
  }, [effectiveRepoUrl, filters, convertGitHubCommitToEntry])

  // Load entries on mount and filter changes
  useEffect(() => {
    if (effectiveRepo) {
      loadEntries(1, false)
    }
  }, [loadEntries, effectiveRepo])

  // Apply search filter
  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true
    return (
      entry.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.author.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Handle commit click
  const handleCommitClick = (sha: string) => {
    if (repo) {
      navigate(`/${repo}/commit/${sha}`, {
        state: location.state
      })
    }
  }

  if (error) {
    return (
      <div className={`changelog-page ${className}`}>
        <div className="changelog-header">
          <h1 className="changelog-title">
            <HistoryIcon />
            Changelog
          </h1>
          <p className="changelog-subtitle">Recent changes and updates to this repository</p>
        </div>
        <div className="changelog-content">
          <div className="changelog-empty">
            <h3 className="changelog-empty-title">Unable to load changelog</h3>
            <p className="changelog-empty-description">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`changelog-page ${className}`}>
      <div className="changelog-header">
        <h1 className="changelog-title">
          <HistoryIcon />
          Changelog
        </h1>
        <p className="changelog-subtitle">Recent changes and updates to this repository</p>
      </div>

      <div className="changelog-controls">
        <div className="changelog-search">
          <SearchIcon className="changelog-search-icon" />
          <input
            type="text"
            placeholder="Search commits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="changelog-search-input"
          />
        </div>
      </div>

      {isLoading && entries.length === 0 ? (
        <div className="changelog-loading">
          <p>Loading changelog...</p>
        </div>
      ) : (
        <div className="changelog-content">
          {filteredEntries.length === 0 ? (
            <div className="changelog-empty">
              <h3 className="changelog-empty-title">No changelog entries found</h3>
              <p className="changelog-empty-description">
                {searchQuery ? 'Try adjusting your search terms.' : 'No commits are available for this repository.'}
              </p>
            </div>
          ) : (
            <>
              <div className="changelog-results-header">
                <div className="changelog-results-count">
                  Showing {filteredEntries.length} {filteredEntries.length === 1 ? 'commit' : 'commits'}
                </div>
              </div>
              
              <div className="changelog-entries">
                {filteredEntries.map((entry) => {
                  const authorInitials = entry.author
                    .split(' ')
                    .map(name => name.charAt(0))
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <div 
                      key={entry.id} 
                      className="changelog-entry"
                      onClick={() => handleCommitClick(entry.sha)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view commit details"
                    >
                      <div className="changelog-entry-avatar">
                        {authorInitials}
                      </div>
                      
                      <div className="changelog-entry-content">
                        <div className="changelog-entry-header">
                          <span className="changelog-entry-author">{entry.author}</span>
                          <span className="changelog-entry-date">{formatDate(new Date(entry.date))}</span>
                          <span 
                            className="changelog-entry-commit"
                            style={{ cursor: 'pointer' }}
                            title="Click to view commit details"
                          >
                            {entry.sha.slice(0, 7)}
                          </span>
                        </div>
                        
                        <div className="changelog-entry-message">
                          {entry.message.split('\n')[0]}
                          {entry.message.split('\n').slice(1).join('\n').trim() && (
                            <div style={{ marginTop: '8px', fontSize: '14px', opacity: '0.8' }}>
                              {entry.message.split('\n').slice(1).join('\n').trim()}
                            </div>
                          )}
                        </div>
                        
                        <div className="changelog-entry-stats">
                          <div className="changelog-entry-stat changelog-entry-files">
                            <span className="changelog-entry-stat-number">{entry.filesChanged}</span>
                            <span>files changed</span>
                          </div>
                          {entry.linesAdded > 0 && (
                            <div className="changelog-entry-stat changelog-entry-additions">
                              <span className="changelog-entry-stat-number">+{entry.linesAdded}</span>
                              <span>additions</span>
                            </div>
                          )}
                          {entry.linesDeleted > 0 && (
                            <div className="changelog-entry-stat changelog-entry-deletions">
                              <span className="changelog-entry-stat-number">-{entry.linesDeleted}</span>
                              <span>deletions</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {hasMore && (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <button 
                    onClick={() => loadEntries(currentPage + 1, true)}
                    disabled={isLoading}
                    style={{
                      padding: '12px 24px',
                      border: '1px solid var(--sidebar-border)',
                      borderRadius: '8px',
                      background: 'var(--docs-bg)',
                      color: 'var(--docs-text)',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default EmbeddedChangelog
