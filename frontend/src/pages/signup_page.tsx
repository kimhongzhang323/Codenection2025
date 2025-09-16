import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './signup_page.css';

const SignUp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGitHubAuth = async () => {
    setIsLoading(true);
    
    // Simulate GitHub OAuth flow
    // In a real implementation, this would redirect to GitHub OAuth
    try {
      // GitHub OAuth URL with required scopes
      const clientId = 'your_github_client_id';
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
      const scopes = encodeURIComponent('read:user repo');
      
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&state=random_string`;
      
      // For demo purposes, we'll just navigate to dashboard after a delay
      setTimeout(() => {
        setIsLoading(false);
        navigate('/dashboard');
      }, 2000);
      
      // In real implementation, uncomment this:
      // window.location.href = githubAuthUrl;
      
      // Suppress unused variable warning for demo
      console.log('GitHub OAuth URL:', githubAuthUrl);
    } catch (error) {
      setIsLoading(false);
      console.error('Authentication failed:', error);
    }
  };

  const handleBackToWelcome = () => {
    navigate('/');
  };

  return (
    <div className="signup-container">
      {/* Back button positioned at top left of the page */}
      <button onClick={handleBackToWelcome} className="back-button-page">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Back
      </button>

      <div className="signup-content">
        {/* Main Content */}
        <div className="signup-main">
          <div className="signup-card">
            <div className="card-header">
              <h1 className="card-title">Connect your GitHub</h1>
              <p className="card-description">
                Link your GitHub account to access and generate documentation for your repositories
              </p>
            </div>

            <div className="permissions-section">
              <h3 className="permissions-title">AutoDocX will be able to:</h3>
              <ul className="permissions-list">
                <li className="permission-item">
                  <svg className="permission-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  Read your public and private repositories
                </li>
                <li className="permission-item">
                  <svg className="permission-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  Access repository contents and structure
                </li>
                <li className="permission-item">
                  <svg className="permission-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  Read your profile information
                </li>
                <li className="permission-item">
                  <svg className="permission-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"/>
                  </svg>
                  Generate and update documentation files
                </li>
              </ul>
            </div>

            <div className="auth-section">
              <button 
                onClick={handleGitHubAuth}
                disabled={isLoading}
                className="github-auth-button"
              >
                {isLoading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <svg className="github-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                )}
                Continue with GitHub
              </button>

              <div className="divider">
                <span>or</span>
              </div>

              <button onClick={handleBackToWelcome} className="skip-button">
                Skip for now
              </button>
            </div>

            <div className="security-note">
              <svg className="security-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="m7 11 0-5a5 5 0 0 1 10 0v5"/>
              </svg>
              <p>Your data is secure. We never store your code or sensitive information.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="signup-footer">
          <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;