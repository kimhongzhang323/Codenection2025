import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { checkGithubUrlPublic, fetchGithubRepoDetails, type GithubRepoDetails } from './lib/utils'
import { LinkIcon } from './components/url_icon'
import { SearchIcon } from './components/search_icon'
import { CheckIcon } from './components/check_icon'
import { XIcon } from './components/close_icon'
import { ArrowRightIcon } from './components/arrow_icon'
import DocumentationPage from './pages/DocumentationPage'
import SignUpPage from './pages/SignUpPage'
import TextSelectionDialog from './components/TextSelectionDialog'
import { AIChatPanel } from './components/AIChatPanel'
import { AIChatProvider } from './contexts/AIChatContext'
import DocumentationSystem from './components/docs_flow'
import './App.css'

function HomePage() {
  const [repoUrl, setRepoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [showRepoDetails, setShowRepoDetails] = useState(false)
  const [repoData, setRepoData] = useState<GithubRepoDetails | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const navigate = useNavigate()
  
  // Show repo details after 1 second when success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(async () => {
        setShowRepoDetails(true)
        
        // Fetch real repository data from GitHub API
        const result = await checkGithubUrlPublic(repoUrl)
        if (result.valid && result.repo) {
          const details = await fetchGithubRepoDetails(result.repo)
          if (details) {
            setRepoData(details)
          }
        }
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setShowRepoDetails(false)
      setRepoData(null)
    }
  }, [isSuccess, repoUrl])

  // Show tooltip when error occurs
  useEffect(() => {
    if (isError) {
      setShowTooltip(true)
      // Hide tooltip after 5 seconds
      const timer = setTimeout(() => {
        setShowTooltip(false)
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setShowTooltip(false)
    }
  }, [isError])

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    await submitCheck()
  }

  async function submitCheck() {
    if (!repoUrl) return
    setIsSuccess(false)
    setIsError(false)
    setIsLoading(true)
    const controller = new AbortController()
    try {
      const result = await checkGithubUrlPublic(repoUrl, controller.signal)
      // For now, just log. Hook into your flow as needed.
      if (result.valid) {
        console.log('Public repository detected:', result.repo)
        setIsSuccess(true)
      } else {
        console.warn(result.reason || 'Invalid repository URL')
        setIsSuccess(false)
        setIsError(true)
      }
    } catch (err) {
      console.error('Validation error', err)
      setIsSuccess(false)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  function handleArrowClick() {
    if (repoData) {
      const slug = (repoData.fullName || '').toLowerCase()
      navigate(`/docs-flow/${encodeURIComponent(slug)}`, {
        state: { repoData, repoUrl },
      })
    }
  }

  function handleSignUpClick() {
    navigate('/signup')
  }

  return (
    <main className="home">
      <div className="home__signup-container">
        <button className="home__signup-btn" onClick={handleSignUpClick}>
          Sign Up
        </button>
        {showTooltip && (
          <div className="home__tooltip">
            <img src="/tooltip.png" alt="Tooltip" className="home__tooltip-image" />
          </div>
        )}
      </div>
      <img src="/logo.png" alt="App logo" className="home__logo" />
      <h1 className="home__title">AutoDocX</h1>
      <p className="home__subtitle">Enter your GitHub repository URL to get started</p>
      <div className="home__input-wrapper">
        <input
          className="home__input"
          type="url"
          inputMode="url"
          placeholder="https://github.com/owner/repo"
          aria-label="GitHub repository URL"
          value={repoUrl}
          onChange={(e) => {
            const v = e.target.value
            setRepoUrl(v)
            // Any change resets visual state back to search
            setIsSuccess(false)
            setIsLoading(false)
            setIsError(false)
          }}
          onKeyDown={handleKeyDown}
        />
        <LinkIcon className="home__input-icon--left" size={16} />
        {isSuccess ? (
          <CheckIcon className="home__input-icon--right text-success" aria-label="Success" />
        ) : isError ? (
          <XIcon className="home__input-icon--right text-danger" aria-label="Not found" />
        ) : (
          <SearchIcon
            className={`home__input-icon--right home__input-icon-button ${isLoading ? 'is-loading' : ''}`}
            onClick={submitCheck as unknown as React.MouseEventHandler<HTMLDivElement>}
            aria-label="Submit URL"
          />
        )}
      </div>
      
      {/* Repository Details Container */}
      {showRepoDetails && repoData && (
        <div className="repo-details">
          <div className="repo-details__header">
            <div className="repo-details__name">{repoData.name}</div>
            <div className="repo-details__full-name">{repoData.fullName}</div>
          </div>
          <div className="repo-details__description">{repoData.description}</div>
          <div className="repo-details__footer">
            <div className="repo-details__stars">
              <img src="/star.png" alt="Star" className="repo-details__star-icon" />
              {repoData.stars}
            </div>
            <ArrowRightIcon 
              className="repo-details__arrow-icon" 
              size={20}
              onClick={handleArrowClick}
            />
          </div>
        </div>
      )}
    </main>
  )
}

function DocsFlowPage() {
  const location = useLocation() as { state?: { repoData?: GithubRepoDetails; repoUrl?: string } }
  const navigate = useNavigate()
  const { repo } = useParams<{ repo: string }>()
  const repoData = location.state?.repoData
  const repoUrl = location.state?.repoUrl

  const handleDocumentationCreated = () => {
    // Navigate to the actual documentation page
    if (repo) {
      navigate(`/${repo}`, {
        state: { repoData, repoUrl },
      })
    }
  }

  const handleBackToApp = () => {
    // Navigate back to home page
    navigate('/')
  }

  return (
    <DocumentationSystem
      hasExistingDoc={false}
      isEditing={false}
      onDocumentationCreated={handleDocumentationCreated}
      onBackToApp={handleBackToApp}
    />
  )
}

function App() {
  return (
    <AIChatProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/docs-flow/:repo" element={<DocsFlowPage />} />
        <Route path="/:repo" element={<DocumentationPage />} />
        <Route path="/:repo/:file" element={<DocumentationPage />} />
        <Route path="/documentation" element={<DocumentationPage />} />
      </Routes>
      <TextSelectionDialog />
      <AIChatPanel />
    </AIChatProvider>
  )
}

export default App
