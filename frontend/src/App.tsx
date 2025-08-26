import { useState } from 'react'
import { LinkIcon } from './components/url_icon'
import './App.css'

function App() {
  const [repoUrl, setRepoUrl] = useState('')

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
          onChange={(e) => setRepoUrl(e.target.value)}
        />
        <LinkIcon className="home__input-icon--right" size={18} />
      </div>
    </main>
  )
}

export default App
