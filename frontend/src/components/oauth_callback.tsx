import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './oauth_callback.css';

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const userId = searchParams.get('user');
        const username = searchParams.get('username');
        const status = searchParams.get('status');
        const errorParam = searchParams.get('error');
        const message = searchParams.get('message');

        // Handle OAuth errors as per GitHub documentation
        if (errorParam) {
          const errorMessage = message || 'Authentication failed. Please try again.';
          console.error('OAuth Error:', errorParam, errorMessage);
          setError(errorMessage);
          setIsLoading(false);
          return;
        }

        // Verify successful OAuth flow
        if (status === 'success' && token && userId) {
          // Store authentication data securely
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_id', userId);
          if (username) {
            localStorage.setItem('username', username);
          }
          
          // Store GitHub access token
          const githubToken = searchParams.get('github_token');
          if (githubToken) {
            localStorage.setItem('github_access_token', githubToken);
          }
          
          // Validate token with backend (recommended by GitHub docs)
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'}/auth/validate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ token, userId }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.valid) {
              // Store additional user data if available
              if (data.email) {
                localStorage.setItem('user_email', data.email);
              }
              
              // Successful authentication - redirect to dashboard
              navigate('/dashboard', { replace: true });
            } else {
              setError('Authentication token validation failed.');
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            setError(errorData.message || 'Failed to validate authentication with server.');
          }
        } else {
          setError('Invalid OAuth callback parameters. Missing required authentication data.');
        }
      } catch (err) {
        console.error('OAuth callback processing error:', err);
        setError('Network error occurred during authentication. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (isLoading) {
    return (
      <div className="oauth-callback-container">
        <div className="loading-spinner"></div>
        <p>Completing authentication...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="oauth-callback-container">
        <div className="error-message">
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/sign-in')} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default OAuthCallback;
