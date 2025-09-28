import React, { useState, useEffect, useCallback } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { SearchIcon } from '../components/icons/search_icon'
import { HistoryIcon } from '../components/icons/history_icon'
import type { 
  ChangelogEntry, 
  ChangelogFilter
} from '../types/changelog'
import type { GitHubCommit } from '../services/api'
import { changelogApi } from '../services/api'
import './changelog_page.css'

interface ChangelogPageProps {
  className?: string
}

const ChangelogPage: React.FC<ChangelogPageProps> = ({ className = '' }) => {
  const location = useLocation() as { state?: { repoUrl?: string; repoData?: { name?: string; fullName?: string } } }
  const { repo } = useParams<{ repo: string }>()
  const navigate = useNavigate()
  
  // State management
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Filters
  const [filters, setFilters] = useState<ChangelogFilter>({
    searchQuery: '',
    author: '',
    dateFrom: '',
    dateTo: '',
    fileExtension: '',
    branch: 'main'
  })
  const [sortBy, setSortBy] = useState<'date' | 'author' | 'changes'>('date')
  const [authors, setAuthors] = useState<string[]>([])

  // Get the current workspace repository (prioritize URL parameter)
  const getCurrentRepository = () => {
    // If URL has repo parameter, use it
    if (repo && repo.includes('/')) {
      return {
        url: `https://github.com/${repo}`,
        name: repo
      }
    }
    
    // Fallback to current workspace repository
    const currentWorkspaceRepo = 'kimhongzhang323/Codenection2025'
    return {
      url: `https://github.com/${currentWorkspaceRepo}`,
      name: currentWorkspaceRepo
    }
  }
  
  const currentRepo = getCurrentRepository()
  const repoUrl = currentRepo.url
  const repoName = currentRepo.name
  
  console.log('Changelog Repository Info:', { repo, repoUrl, repoName })

  // Convert GitHub commit to ChangelogEntry
  const convertGitHubCommitToEntry = useCallback((commit: GitHubCommit): ChangelogEntry => {
    const filesChanged = commit.files?.length || 0
    const linesAdded = commit.stats?.additions || 0
    const linesDeleted = commit.stats?.deletions || 0
    
    // Analyze commit message for tags
    const message = commit.commit.message.toLowerCase()
    const tags: string[] = []
    if (message.includes('fix') || message.includes('bug')) tags.push('bugfix')
    if (message.includes('feat') || message.includes('add') || message.includes('new')) tags.push('feature')
    if (message.includes('doc') || message.includes('readme')) tags.push('docs')
    if (message.includes('refactor') || message.includes('cleanup')) tags.push('refactor')
    if (message.includes('test') || message.includes('spec')) tags.push('test')
    
    return {
      id: commit.sha,
      commit: {
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author,
        committer: commit.commit.committer,
        url: commit.url,
        html_url: commit.html_url,
        stats: commit.stats
      },
      files: (commit.files || []).map(file => ({
        ...file,
        status: file.status as 'added' | 'removed' | 'modified' | 'renamed',
        blob_url: `https://github.com/${repoName}/blob/${commit.sha}/${file.filename}`,
        raw_url: `https://raw.githubusercontent.com/${repoName}/${commit.sha}/${file.filename}`,
        contents_url: `https://api.github.com/repos/${repoName}/contents/${file.filename}?ref=${commit.sha}`
      })),
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      sha: commit.sha,
      branch: filters.branch || 'main',
      tags,
      filesChanged,
      linesAdded,
      linesDeleted
    }
  }, [filters.branch, repoName])

  // Load changelog data
  const loadChangelog = useCallback(async (page: number = 1, resetResults: boolean = true) => {
    if (!repoUrl) {
      setError(`No valid GitHub repository URL available. Please access this page from a repository documentation page.`)
      setIsLoading(false)
      return
    }
    
    // Validate the repository URL format
    if (repoUrl === `https://github.com/${repo}` && (!repo || !repo.includes('/'))) {
      setError(`Invalid repository format: "${repo}". Expected format: owner/repository. Please navigate to this page from a valid GitHub repository.`)
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    setError(null)

    console.log('Loading changelog for repo URL:', repoUrl)

    // Check for GitHub access token
    const accessToken = localStorage.getItem('github_access_token')
    if (!accessToken) {
      setError('GitHub access token not found. Please sign in to view repository changelog.')
      setIsLoading(false)
      return
    }

    try {
      let commits: GitHubCommit[] = []
      
      // If we have filters, use filtered API call
      if (filters.author || filters.dateFrom || filters.dateTo) {
        const filterParams = {
          author: filters.author,
          since: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : undefined,
          until: filters.dateTo ? new Date(filters.dateTo).toISOString() : undefined,
          branch: filters.branch || 'main'
        }
        commits = await changelogApi.getFilteredCommits(repoUrl, filterParams)
      } else {
        // Regular commit loading with pagination
        commits = await changelogApi.getCommits(repoUrl, filters.branch || 'main', page, 20)
      }

      // Convert GitHub commits to changelog entries
      const entries = commits.map(convertGitHubCommitToEntry)
      
      // Debug: Log stats availability
      const commitsWithStats = commits.filter(c => c.stats && (c.stats.additions > 0 || c.stats.deletions > 0))
      console.log(`Loaded ${commits.length} commits, ${commitsWithStats.length} with stats`)
      
      // Extract unique authors for filter dropdown
      const uniqueAuthors = [...new Set(commits.map(c => c.commit.author.name))]
      setAuthors(uniqueAuthors)

      if (resetResults) {
        setEntries(entries)
      } else {
        setEntries(prev => [...prev, ...entries])
      }
      
      setHasMore(commits.length === 20) // Assume more if we got a full page
      setCurrentPage(page)
    } catch (err) {
      console.error('Error loading changelog:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load changelog'
      
      if (errorMessage.includes('Invalid GitHub URL format')) {
        setError(`${errorMessage}. Repository URL: "${repoUrl}"`)
      } else if (errorMessage.includes('404')) {
        setError(`Repository not found or access denied. Please check if the repository exists and you have access to it.`)
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        setError(`Authentication failed. Please check your GitHub access token and permissions.`)
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }, [repoUrl, repo, filters, convertGitHubCommitToEntry])

  // Search functionality with debounce for real-time search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setFilters(prev => ({ ...prev, searchQuery: query }))
    setCurrentPage(1)
    
    // If searching GitHub API (optional enhancement)
    if (query.trim() && query.length > 2) {
      // Could implement real-time GitHub search here
      // For now, we'll just filter the existing results
    }
  }, [])

  // Filter functionality
  const handleFilterChange = useCallback((newFilters: Partial<ChangelogFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1)
  }, [])

  // Entry selection - navigate to commit detail page with full page refresh
  const handleEntryClick = useCallback((entry: ChangelogEntry) => {
    // Store current repository data in localStorage for the detail page
    const currentRepoUrl = repo && repo.includes('/') ? `https://github.com/${repo}` : repoUrl
    if (currentRepoUrl) localStorage.setItem('current_repo_url', currentRepoUrl)
    if (repo) localStorage.setItem('current_repo_name', repo)
    
    // Add loading cursor for visual feedback
    document.body.style.cursor = 'wait'
    
    // Force full page reload like sidebar navigation
    window.location.href = `/${repo}/commit/${entry.sha}`
  }, [repo, repoUrl])

  // Load more functionality
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadChangelog(currentPage + 1, false)
    }
  }, [hasMore, isLoading, currentPage, loadChangelog])

  // Initial load
  useEffect(() => {
    loadChangelog()
  }, [loadChangelog])

  // Handle reload when returning from commit detail page
  useEffect(() => {
    const state = location.state as { shouldReload?: boolean; repoUrl?: string; repoData?: { name?: string; fullName?: string } } | null
    if (state?.shouldReload) {
      // Clear the shouldReload flag and reload the changelog
      navigate(window.location.pathname, { replace: true, state: { ...state, shouldReload: false } })
      console.log('Auto-refreshing changelog after returning from commit details...')
      loadChangelog()
    }
  }, [location.state, navigate, loadChangelog])

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  // Filter and sort entries based on search and sort criteria
  const filteredEntries = entries
    .filter(entry => {
      if (!searchQuery) return true
      
      const query = searchQuery.toLowerCase()
      return (
        entry.message.toLowerCase().includes(query) ||
        entry.author.toLowerCase().includes(query) ||
        entry.sha.toLowerCase().includes(query) ||
        entry.tags.some(tag => tag.toLowerCase().includes(query))
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'author':
          return a.author.localeCompare(b.author)
        case 'changes':
          return (b.linesAdded + b.linesDeleted) - (a.linesAdded + a.linesDeleted)
        case 'date':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
    })

  return (
    <div className={`changelog-page ${className}`}>
      {/* Header */}
      <div className="changelog-header">
        <h1 className="changelog-title">
          <HistoryIcon size={24} />
          Changelog
        </h1>
        <p className="changelog-subtitle">
          Track all changes and commits for {repoName}
        </p>
      </div>

      {/* Controls */}
      <div className="changelog-controls">
        <div className="changelog-search">
          <SearchIcon size={16} className="changelog-search-icon" />
          <input
            type="text"
            placeholder="Search commits, authors, or files..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="changelog-search-input"
          />
        </div>
        
        <div className="changelog-filters">
          <div className="changelog-filter">
            <select 
              value={filters.author || ''}
              onChange={(e) => handleFilterChange({ author: e.target.value || undefined })}
            >
              <option value="">All Authors</option>
              {authors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>
          
          <div className="changelog-filter">
            <select 
              value={filters.branch || 'main'}
              onChange={(e) => handleFilterChange({ branch: e.target.value })}
            >
              <option value="main">main</option>
              <option value="develop">develop</option>
              <option value="feature/*">feature/*</option>
            </select>
          </div>
          
          <div className="changelog-filter">
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange({ dateFrom: e.target.value || undefined })}
              placeholder="From date"
            />
          </div>
          
          <div className="changelog-filter">
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange({ dateTo: e.target.value || undefined })}
              placeholder="To date"
            />
          </div>
        </div>
      </div>

      {/* Results Header with Stats */}
      <div className="changelog-results-header">
        <div className="changelog-results-count">
          {filteredEntries.length} commit{filteredEntries.length !== 1 ? 's' : ''} 
          {entries.length > filteredEntries.length && ` (filtered from ${entries.length})`}
          {isLoading && currentPage === 1 && (
            <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.7 }}>
              (loading detailed stats...)
            </span>
          )}
        </div>
        <div className="changelog-sort">
          Sort by:
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'author' | 'changes')}
          >
            <option value="date">Date (newest first)</option>
            <option value="author">Author</option>
            <option value="changes">Changes</option>
          </select>
        </div>
      </div>

      {/* Changelog Entries */}
      <div className="changelog-content">
        {!repoUrl ? (
          <div className="changelog-empty">
            <HistoryIcon size={48} />
            <h3 className="changelog-empty-title">Repository Not Found</h3>
            <p className="changelog-empty-description">
              To view the changelog, please navigate to this page from a repository's documentation page.
              The changelog requires a valid GitHub repository URL to fetch commit history.
            </p>
          </div>
        ) : isLoading && entries.length === 0 ? (
          <div className="changelog-loading">
            <p>Loading changelog...</p>
          </div>
        ) : error ? (
          <div className="changelog-empty">
            <HistoryIcon size={48} />
            <h3 className="changelog-empty-title">Error loading changelog</h3>
            <p className="changelog-empty-description">{error}</p>
            {error.includes('Invalid repository format') && (
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'var(--background-secondary)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>How to access a repository changelog:</h4>
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.5' }}>
                  <li>Go to the dashboard and select a repository</li>
                  <li>Navigate to the documentation page</li>
                  <li>Click on "Changelog" in the sidebar</li>
                  <li>Or use URL format: /owner/repository/changelog</li>
                </ol>
              </div>
            )}
            <button 
              onClick={() => loadChangelog()}
              style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #646cff', background: '#646cff', color: 'white', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="changelog-entries">
            {filteredEntries.map((entry) => (
              <div 
                key={entry.id} 
                className="changelog-entry"
                onClick={() => handleEntryClick(entry)}
              >
                <div className="changelog-entry-avatar">
                  {getAuthorInitials(entry.author)}
                </div>
                
                <div className="changelog-entry-content">
                  <div className="changelog-entry-header">
                    <span className="changelog-entry-author">{entry.author}</span>
                    <span className="changelog-entry-date">{formatDate(entry.date)}</span>
                    <span className="changelog-entry-commit">{entry.sha.slice(0, 7)}</span>
                  </div>
                  
                  <div className="changelog-entry-message">{entry.message}</div>
                  
                  {(entry.filesChanged > 0 || entry.linesAdded > 0 || entry.linesDeleted > 0) && (
                    <div className="changelog-entry-stats">
                      {entry.filesChanged > 0 && (
                        <div className="changelog-entry-stat changelog-entry-files">
                          <span className="changelog-entry-stat-number">{entry.filesChanged}</span>
                          <span>file{entry.filesChanged !== 1 ? 's' : ''}</span>
                        </div>
                      )}
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
                      {entry.filesChanged === 0 && entry.linesAdded === 0 && entry.linesDeleted === 0 && (
                        <div className="changelog-entry-stat" style={{ color: 'var(--docs-normal-text)', opacity: 0.7 }}>
                          <span>Stats not available</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <button 
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #646cff', background: 'transparent', color: '#646cff', cursor: 'pointer' }}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
            
            {filteredEntries.length === 0 && !isLoading && (
              <div className="changelog-empty">
                <HistoryIcon size={48} />
                <h3 className="changelog-empty-title">No changelog entries found</h3>
                <p className="changelog-empty-description">Try adjusting your search terms or filters.</p>
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  )
}

export default ChangelogPage
