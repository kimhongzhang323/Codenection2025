import React, { useState, useEffect } from 'react'
import './github_bot_demo.css'

interface GitHubBotDemoProps {
  isVisible: boolean
  onClose: () => void
  repoUrl?: string
}

const GitHubBotDemo: React.FC<GitHubBotDemoProps> = ({ isVisible, onClose, repoUrl }) => {
  const [demoCommits, setDemoCommits] = useState<Array<{
    sha: string
    message: string
    author: string
    time: string
  }>>([])

  useEffect(() => {
    if (isVisible) {
      // Simulate demo commits
      const mockCommits = [
        {
          sha: 'abc123d',
          message: 'Added auto-update notification system',
          author: 'Developer',
          time: '2 minutes ago'
        },
        {
          sha: 'def456e',
          message: 'Fixed Discord webhook integration',
          author: 'Developer', 
          time: '5 minutes ago'
        },
        {
          sha: 'ghi789f',
          message: 'Enhanced UI components with better styling',
          author: 'Designer',
          time: '8 minutes ago'
        }
      ]
      
      setDemoCommits(mockCommits)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="github-bot-demo-overlay">
      <div className="github-bot-demo-content">
        <div className="github-bot-demo-header">
          <div className="github-bot-demo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
          </div>
          <div className="github-bot-demo-title">
            <h3>GitHub Bot Integration Active</h3>
            <p>Discord notifications enabled for push events</p>
          </div>
          <button className="github-bot-demo-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="github-bot-demo-body">
          <div className="github-bot-demo-status">
            <div className="github-bot-demo-status-item">
              <span className="github-bot-demo-status-label">Repository:</span>
              <span className="github-bot-demo-status-value">{repoUrl || 'Current Repository'}</span>
            </div>
            <div className="github-bot-demo-status-item">
              <span className="github-bot-demo-status-label">Status:</span>
              <span className="github-bot-demo-status-value active">🟢 Active (Simulation Mode)</span>
            </div>
            <div className="github-bot-demo-status-item">
              <span className="github-bot-demo-status-label">Check Interval:</span>
              <span className="github-bot-demo-status-value">3 minutes</span>
            </div>
          </div>

          <div className="github-bot-demo-features">
            <h4>Features Active:</h4>
            <ul>
              <li>✅ Push event notifications to Discord</li>
              <li>✅ Component change detection</li>
              <li>✅ Automatic changelog updates</li>
              <li>✅ Real-time content refresh</li>
            </ul>
          </div>

          <div className="github-bot-demo-recent">
            <h4>Recent Simulated Activity:</h4>
            <div className="github-bot-demo-commits">
              {demoCommits.map((commit) => (
                <div key={commit.sha} className="github-bot-demo-commit">
                  <div className="github-bot-demo-commit-hash">
                    <code>{commit.sha}</code>
                  </div>
                  <div className="github-bot-demo-commit-details">
                    <div className="github-bot-demo-commit-message">{commit.message}</div>
                    <div className="github-bot-demo-commit-meta">
                      {commit.author} • {commit.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="github-bot-demo-setup">
            <h4>For Production Setup:</h4>
            <div className="github-bot-demo-instructions">
              <ol>
                <li>Configure Discord webhook URL in settings</li>
                <li>Set up GitHub webhook at: <code>/api/github-webhook</code></li>
                <li>Enable webhook for push events</li>
                <li>Notifications will be sent automatically!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GitHubBotDemo
