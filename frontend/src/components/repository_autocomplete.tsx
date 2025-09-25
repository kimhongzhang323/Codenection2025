import { useState, useEffect, useRef, useCallback } from 'react'
import { githubApi, userApi, type GitHubRepository } from '../services/api'
import './ui/repository_autocomplete.css'

interface RepositoryAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (repository: GitHubRepository) => void
  placeholder?: string
  className?: string
}

export default function RepositoryAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "https://github.com/owner/repo",
  className = ""
}: RepositoryAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepository[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Extracted loadRepositories function to reuse
  const loadRepositories = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Check if GitHub access token is available
      let accessToken = localStorage.getItem('github_access_token')
      if (!accessToken) {
        // Try to fetch user data first to get the GitHub token
        try {
          await userApi.getCurrentUser()
          // Token should now be available
          accessToken = localStorage.getItem('github_access_token')
          if (!accessToken) {
            // Fallback: Use personal access token from environment variable
            // In production, this should be handled through proper OAuth2 flow
            accessToken = import.meta.env.VITE_GITHUB_ACCESS_TOKEN || ''
            if (accessToken) {
              localStorage.setItem('github_access_token', accessToken)
              console.log('Using fallback personal access token from environment')
            }
          }
        } catch (err) {
          console.warn('Failed to get user data:', err)
          // Still try fallback token
          accessToken = ''
          localStorage.setItem('github_access_token', accessToken)
          console.log('Using fallback personal access token after user fetch failed')
        }
      }

      // Now fetch repositories with the available token
      const repos = await githubApi.getUserRepositories()
      setRepositories(repos)
    } catch (err) {
      console.warn('Failed to load repositories:', err)
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load user repositories on component mount (only if GitHub token is already available)
  useEffect(() => {
    const accessToken = localStorage.getItem('github_access_token')
    if (accessToken) {
      loadRepositories()
    }
  }, [loadRepositories])

  // Filter repositories based on input value
  useEffect(() => {
    if (!value.trim()) {
      setFilteredRepos(repositories.slice(0, 10)) // Show first 10 repos when no filter
    } else {
      const query = value.toLowerCase()
      const filtered = repositories.filter(repo => 
        repo.name.toLowerCase().includes(query) ||
        repo.full_name.toLowerCase().includes(query) ||
        (repo.description && repo.description.toLowerCase().includes(query))
      ).slice(0, 10)
      setFilteredRepos(filtered)
    }
    setSelectedIndex(-1)
  }, [value, repositories])

  // Handle input focus - show dropdown
  const handleFocus = () => {
    setIsOpen(true)
    
    // If repositories haven't been loaded yet and no error, try loading them
    if (repositories.length === 0 && !error && !isLoading) {
      loadRepositories()
    }
  }

  // Handle input blur - hide dropdown after a delay
  const handleBlur = () => {
    // Delay to allow for clicking on dropdown items
    setTimeout(() => {
      setIsOpen(false)
      setSelectedIndex(-1)
    }, 200)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredRepos.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && filteredRepos[selectedIndex]) {
          handleRepositorySelect(filteredRepos[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle repository selection
  const handleRepositorySelect = (repo: GitHubRepository) => {
    onChange(repo.html_url)
    onSelect(repo)
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  // Format repository display
  const formatRepoDisplay = (repo: GitHubRepository) => {
    return {
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || 'No description',
      language: repo.language,
      stars: repo.stargazers_count,
      isPrivate: repo.private
    }
  }

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  return (
    <div ref={containerRef} className={`repo-autocomplete ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="repo-autocomplete__input"
        autoComplete="off"
      />
      
      {isOpen && (
        <div className="repo-autocomplete__dropdown">
          {isLoading ? (
            <div className="repo-autocomplete__loading">
              Loading repositories...
            </div>
          ) : error ? (
            <div className="repo-autocomplete__error">
              {error}
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="repo-autocomplete__empty">
              {repositories.length === 0 
                ? 'Type to search repositories or paste a GitHub URL'
                : 'No repositories match your search.'
              }
            </div>
          ) : (
            <div ref={listRef} className="repo-autocomplete__dropdown-list">
              {filteredRepos.map((repo, index) => {
                const display = formatRepoDisplay(repo)
                return (
                  <div
                    key={repo.id}
                    className={`repo-autocomplete__item ${
                      index === selectedIndex ? 'repo-autocomplete__item--highlighted' : ''
                    }`}
                    onClick={() => handleRepositorySelect(repo)}
                  >
                    <div className="repo-autocomplete__item-icon">
                      📁
                    </div>
                    <div className="repo-autocomplete__item-info">
                      <div className="repo-autocomplete__item-name">
                        {display.name}
                      </div>
                      {display.description && (
                        <div className="repo-autocomplete__item-description">
                          {display.description}
                        </div>
                      )}
                    </div>
                    <div className="repo-autocomplete__item-meta">
                      {display.language && (
                        <div className="repo-autocomplete__item-language">
                          <div className={`repo-autocomplete__language-dot repo-autocomplete__language-dot--${display.language.toLowerCase()}`}></div>
                          {display.language}
                        </div>
                      )}
                      <span>⭐ {display.stars}</span>
                      {display.isPrivate && <span>🔒</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
