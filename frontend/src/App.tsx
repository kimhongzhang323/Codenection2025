import { useState } from 'react'
import { checkGithubUrlPublic } from './lib/utils'
import { LinkIcon } from './components/url_icon'
import { SearchIcon } from './components/search_icon'
import { CheckIcon } from './components/check_icon'
import { XIcon } from './components/close_icon'
import './App.css'

function App() {
  const [repoUrl, setRepoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  
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

  return (
    <main className="home">
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
    </main>
  )
}

export default App
