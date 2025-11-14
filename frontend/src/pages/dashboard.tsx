import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserProfile from '../components/user_profile';
import './dashboard.css';

interface User {
  id: string;
  username: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthFromFragment = () => {
      try {
        // Check URL fragment for authentication data (from direct OAuth redirect)
        const fragment = window.location.hash.substring(1);
        const urlParams = new URLSearchParams(fragment);
        
        const token = urlParams.get('token');
        const userId = urlParams.get('user');
        const username = urlParams.get('username');
        const status = urlParams.get('status');

        if (status === 'success' && token && userId) {
          // Store authentication data
          localStorage.setItem('auth_token', token);
          localStorage.setItem('user_id', userId);
          if (username) {
            localStorage.setItem('username', username);
          }

          // Validate token with backend
          validateAuthToken(token, userId);
          
          // Clear the fragment from URL for security
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          // Check if user is already authenticated
          checkExistingAuth();
        }
      } catch (err) {
        console.error('Error processing authentication:', err);
        setError('Failed to process authentication data.');
        setIsLoading(false);
      }
    };

    const validateAuthToken = async (token: string, userId: string) => {
      try {
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
            // Get full user information
            await fetchUserProfile(token);
          } else {
            setError('Authentication token is invalid.');
            handleAuthFailure();
          }
        } else {
          setError('Failed to validate authentication token.');
          handleAuthFailure();
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setError('Network error during authentication validation.');
        handleAuthFailure();
      }
    };

    const fetchUserProfile = async (token: string) => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'}/auth/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser({
            id: data.user.githubId || localStorage.getItem('user_id') || '',
            username: data.user.username || localStorage.getItem('username') || '',
            email: data.user.email,
            name: data.user.name,
            avatarUrl: data.user.avatarUrl,
          });
        } else {
          // Use stored data if API call fails
          setUser({
            id: localStorage.getItem('user_id') || '',
            username: localStorage.getItem('username') || '',
            email: localStorage.getItem('user_email') || undefined,
          });
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        // Use stored data as fallback
        setUser({
          id: localStorage.getItem('user_id') || '',
          username: localStorage.getItem('username') || '',
          email: localStorage.getItem('user_email') || undefined,
        });
      } finally {
        setIsLoading(false);
      }
    };

    const checkExistingAuth = () => {
      const token = localStorage.getItem('auth_token');
      const userId = localStorage.getItem('user_id');

      if (token && userId) {
        validateAuthToken(token, userId);
      } else {
        handleAuthFailure();
      }
    };

    const handleAuthFailure = () => {
      setIsLoading(false);
      // Clear any stale auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('username');
      localStorage.removeItem('user_email');
      // Redirect to sign-in
      navigate('/sign-in');
    };

    handleAuthFromFragment();
  }, [navigate]);

  // Removed unused handleLogout function to fix compile error.

  const handleCreateDocumentation = () => {
    navigate('/docs-flow/new');
  };

  const handleViewDocumentation = () => {
    navigate('/documentation');
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-section">
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/sign-in')} className="btn-primary">
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-container">
        <div className="error-section">
          <h2>No User Data</h2>
          <p>Unable to load user information.</p>
          <button onClick={() => navigate('/sign-in')} className="btn-primary">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Welcome to AutoDocX</h1>
          <UserProfile />
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-grid">
          <div className="welcome-card">
            <h2>Hello, {user.name || user.username}! 👋</h2>
            <p>Ready to create amazing documentation for your projects?</p>
          </div>

          <div className="action-cards">
            <div className="action-card" onClick={handleCreateDocumentation}>
              <div className="card-icon">📝</div>
              <h3>Create Documentation</h3>
              <p>Start building documentation for your project with AI assistance</p>
              <div className="card-action">Get Started →</div>
            </div>

            <div className="action-card" onClick={handleViewDocumentation}>
              <div className="card-icon">📚</div>
              <h3>View Documentation</h3>
              <p>Browse and manage your existing documentation</p>
              <div className="card-action">View Docs →</div>
            </div>

            <div className="action-card">
              <div className="card-icon">⚙️</div>
              <h3>Settings</h3>
              <p>Manage your account settings and preferences</p>
              <div className="card-action">Configure →</div>
            </div>
          </div>

          <div className="recent-activity">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              <div className="activity-item">
                <span className="activity-icon">🎉</span>
                <div className="activity-content">
                  <p><strong>Welcome to AutoDocX!</strong></p>
                  <p className="activity-time">Just now</p>
                </div>
              </div>
              <div className="activity-item">
                <span className="activity-icon">🔐</span>
                <div className="activity-content">
                  <p>Successfully authenticated with GitHub</p>
                  <p className="activity-time">Just now</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
