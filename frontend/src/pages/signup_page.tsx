import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Magnet from '../components/magnet';
import './signup_page.css';

const SignUp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleGitHubAuth = async () => {
    setIsLoading(true);
    
    try {
      // GitHub OAuth URL with required scopes
      const clientId = 'your_github_client_id';
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
      const scopes = encodeURIComponent('read:user repo');
      
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&state=random_string`;
      
      // For demo purposes, navigate to dashboard after delay
      setTimeout(() => {
        setIsLoading(false);
        navigate('/dashboard');
      }, 2000);
      
      console.log('GitHub OAuth URL:', githubAuthUrl);
    } catch (error) {
      setIsLoading(false);
      console.error('Authentication failed:', error);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Simulate email/password sign in
      setTimeout(() => {
        setIsLoading(false);
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setIsLoading(false);
      console.error('Sign in failed:', error);
    }
  };

  const handleBackToWelcome = () => {
    navigate('/');
  };

  const handleSignInClick = () => {
    navigate('/sign-in');
  };

  return (
    <div className="signup-container">
      {/* Left Side - Quote Panel */}
      <div className="testimonial-section">
        <div className="quote-container">
          <Magnet 
            padding={80} 
            magnetStrength={4} 
            activeTransition="transform 0.2s ease-out"
            inactiveTransition="transform 0.4s ease-in-out"
          >
            <div className="quote-symbol">❝</div>
          </Magnet>
          <Magnet 
            padding={100} 
            magnetStrength={3.5} 
            activeTransition="transform 0.25s ease-out"
            inactiveTransition="transform 0.45s ease-in-out"
          >
            <p className="quote-text">
              Back to building smarter. With AutoDocX, your documentation isn&apos;t just a static file — it&apos;s a living system that keeps up with your code, your team, and your vision.
            </p>
          </Magnet>
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="signin-section">
        {/* Logo inside signin panel */}
        <div className="top-logo" onClick={handleBackToWelcome}>
          <img src="/logo.png" alt="AutoDocX" className="logo-image" />
          <span className="logo-text">AutoDocX</span>
        </div>
        <div className="signin-header">
          <div className="signin-content">
            <h1 className="signin-title">Get Started</h1>
            <p className="signin-subtitle">Create a new account</p>
          </div>
        </div>

        <div className="signin-form">
          {/* GitHub Auth Button */}
          <button 
            onClick={handleGitHubAuth}
            disabled={isLoading}
            className="auth-button github-button"
          >
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                <svg className="auth-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Continue with GitHub
              </>
            )}
          </button>


          {/* Divider */}
          <div className="divider">
            <span>or</span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSignIn} className="email-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <div className="password-header">
                <label htmlFor="password" className="form-label">Password</label>
                <button type="button" className="forgot-password">
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="signin-button"
            >
              {isLoading ? <div className="loading-spinner"></div> : 'Sign Up'}
            </button>
          </form>

          <div className="signup-link">
            Already have an account? <button type="button" className="link-button" onClick={handleSignInClick}>Sign In Now</button>
          </div>
        </div>

        <div className="terms-section">
          <p>By continuing, you agree to AutoDocX's <button type="button" className="link-button">Terms of Service</button> and <button type="button" className="link-button">Privacy Policy</button> and to receive periodic emails with updates.</p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;