import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { checkGithubUrlPublic, fetchGithubRepoDetails, type GithubRepoDetails } from './lib/utils'
import { XIcon } from './components/icons/close_icon'
import { CheckIcon } from './components/icons/check_icon'
import { ArrowRightIcon } from './components/icons/arrow_icon'
import { LinkIcon } from './components/icons/url_icon'
import DocumentationPage from './pages/documentation_page'
import CommitDetailPage from './pages/commit_detail_page'
import SignUpPage from './pages/signup_page'
import SignInPage from './pages/signin_page'
import TracingPage from './pages/tracing_page'
import OAuthCallback from './components/oauth_callback'
import ProtectedRoute from './components/protected_route'
import UserProfile from './components/user_profile'
import TextSelectionDialog from './components/ui/text_selection_dialog'
import { AIChatPanel } from './components/ui/ai_chat_panel'
import { AIChatProvider } from './contexts/AIChatContext'
import { TranslationProvider } from './contexts/TranslationContext'
import DocumentationSystem from './components/docs_flow'
import RepositoryAutocomplete from './components/repository_autocomplete'
import { type GitHubRepository } from './services/api'
import { useAuth } from './services/auth'
import './App.css'

function HomePage() {
  const { isAuthenticated } = useAuth()
  const [repoUrl, setRepoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [showRepoDetails, setShowRepoDetails] = useState(false)
  const [repoData, setRepoData] = useState<GithubRepoDetails | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  // Handle OAuth authentication when accessing /dashboard (optional)
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      // Check URL fragment for authentication data (from direct OAuth redirect)
      const fragment = window.location.hash.substring(1);
      const urlParams = new URLSearchParams(fragment);
      
      const token = urlParams.get('token');
      const userId = urlParams.get('user');
      const username = urlParams.get('username');
      const githubToken = urlParams.get('github_token');
      const status = urlParams.get('status');

      if (status === 'success' && token && userId) {
        // Store authentication data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_id', userId);
        if (username) {
          localStorage.setItem('username', username);
        }
        
        // Store GitHub access token
        if (githubToken) {
          localStorage.setItem('github_access_token', githubToken);
        }

        // Clear the fragment from URL for security
        window.history.replaceState(null, '', '/dashboard');
        
        // Validate token with backend
        fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'}/auth/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ token, userId }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.valid && data.email) {
            localStorage.setItem('user_email', data.email);
          }
        })
        .catch(err => {
          console.error('Token validation error:', err);
        });
      }
      // Note: Removed forced redirect to sign-in - users can now use dashboard without authentication
    }
  }, [location.pathname, navigate]);
  
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

  function handleArrowClick() {
    if (repoData) {
      const slug = (repoData.fullName || '').toLowerCase()
      navigate(`/docs-flow/${encodeURIComponent(slug)}`, {
        state: { repoData, repoUrl },
      })
    }
  }

  async function handleValidateUrl() {
    if (!repoUrl.trim() || isValidating) return
    
    setIsValidating(true)
    setIsLoading(true)
    setIsError(false)
    setIsSuccess(false)
    
    try {
      // Check if URL is valid GitHub URL
      const result = await checkGithubUrlPublic(repoUrl)
      
      if (result.valid && result.repo) {
        // Public repo - fetch details and show success
        const details = await fetchGithubRepoDetails(result.repo)
        if (details) {
          setRepoData(details)
          setIsSuccess(true)
          setShowRepoDetails(true)
        }
      } else {
        // Invalid or private repo - show error and tooltip
        setIsError(true)
        setShowTooltip(true)
      }
    } catch (error) {
      console.error('Error validating repo:', error)
      setIsError(true)
      setShowTooltip(true)
    } finally {
      setIsLoading(false)
      setIsValidating(false)
    }
  }

  function handleRepositorySelect(repository: GitHubRepository) {
    // When a repository is selected from autocomplete, automatically fetch its details
    setIsSuccess(false)
    setIsError(false)
    setIsLoading(true)
    
    const repoUrl = repository.html_url
    setRepoUrl(repoUrl)
    
    // Set repository data immediately from the GitHub API response
    const repoData: GithubRepoDetails = {
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description || '',
      stars: repository.stargazers_count.toString(),
      language: repository.language || '',
      lastUpdated: repository.updated_at
    }
    setRepoData(repoData)
    setIsSuccess(true)
    setIsLoading(false)
    setShowRepoDetails(true)
  }

  return (
    <main className="home">
      <div className="home__signin-container">
        <UserProfile />
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
        <LinkIcon className="home__input-icon--left" size={16} />
        <RepositoryAutocomplete
          value={repoUrl}
          onChange={(value) => {
            setRepoUrl(value)
            // Any change resets visual state back to search
            setIsSuccess(false)
            setIsLoading(false)
            setIsError(false)
            setShowTooltip(false)
          }}
          onSelect={handleRepositorySelect}
          onValidate={handleValidateUrl}
          placeholder={isAuthenticated 
            ? "Search repositories or paste a Github repository URL" 
            : "Paste a Github repository URL to start"}
          className="home__input"
        />
        {isError ? (
          <XIcon className="home__input-icon--right text-danger" aria-label="Not found" />
        ) : isSuccess ? (
          <CheckIcon className="home__input-icon--right text-success" aria-label="Valid repository" />
        ) : isLoading ? (
          <div className="home__input-icon home__input-icon--right" aria-label="Loading">
            <div className="spinner" />
          </div>
        ) : null}
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
      onDocumentationCreated={handleDocumentationCreated}
      onBackToApp={handleBackToApp}
      repoUrl={repoUrl || ''}
    />
  )
}

function App() {
  return (
    <TranslationProvider>
      <AIChatProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/dashboard" element={<HomePage />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/tracing" element={<TracingPage />} />
          <Route path="/docs-flow/:repo" element={<DocsFlowPage />} />

          <Route path="/:repo/commit/:sha" element={<CommitDetailPage />} />
          <Route path="/:repo/changelog" element={<DocumentationPage />} />
          <Route path="/:repo/flowchart" element={<DocumentationPage />} />
          <Route path="/:repo/documentation" element={<DocumentationPage />} />
          <Route path="/:repo/docs/overview" element={<DocumentationPage />} />
          <Route path="/:repo/docs/quickstart" element={<DocumentationPage />} />
          <Route path="/:repo/docs/requirements" element={<DocumentationPage />} />
          <Route path="/:repo" element={<DocumentationPage />} />
          <Route path="/:repo/:file" element={<DocumentationPage />} />
          <Route path="/documentation" element={<DocumentationPage />} />
        </Routes>
        <TextSelectionDialog />
        <AIChatPanel />
      </AIChatProvider>
    </TranslationProvider>
  )
}

export default App