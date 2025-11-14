import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import './user_profile.css';

const UserProfile: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, userEmail, logout } = useAuth();
  const navigate = useNavigate();

  // Monitor localStorage changes for username
  useEffect(() => {
    const updateUsername = () => {
      setUsername(localStorage.getItem('username'));
    };

    // Initial load
    updateUsername();

    // Listen for storage events (when localStorage is modified)
    window.addEventListener('storage', updateUsername);
    
    // Poll for changes since storage event doesn't fire for same-tab changes
    const interval = setInterval(updateUsername, 100);

    return () => {
      window.removeEventListener('storage', updateUsername);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Always clear local storage and redirect
      logout();
      navigate('/');
      setIsDropdownOpen(false);
    }
  };

  const handleSignIn = () => {
    navigate('/sign-in');
  };

  if (!isAuthenticated) {
    return (
      <button className="user-profile__signin-btn" onClick={handleSignIn}>
        Sign In
      </button>
    );
  }

  // VIP Icon component
  const VipIcon = () => (
    <svg className="user-profile__vip-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" fill="currentColor"/>
    </svg>
  );

  // Show welcome message when authenticated
  if (isAuthenticated && !isDropdownOpen) {
    return (
      <button 
        className="user-profile__welcome-btn"
        onClick={() => setIsDropdownOpen(true)}
      >
        <span className="user-profile__welcome-text">
          Welcome back, {username || 'User'}
        </span>
        <VipIcon />
      </button>
    );
  }

  return (
    <div className="user-profile" ref={dropdownRef}>
      <button 
        className="user-profile__trigger"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <div className="user-profile__avatar">
          {userEmail?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="user-profile__email">{userEmail}</span>
        <svg className="user-profile__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="user-profile__dropdown">
          <div className="user-profile__dropdown-header">
            <div className="user-profile__dropdown-avatar">
              {userEmail?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-profile__dropdown-info">
              <div className="user-profile__dropdown-email">{userEmail}</div>
              <div className="user-profile__dropdown-status">Signed in</div>
            </div>
          </div>
          
          <div className="user-profile__dropdown-divider"></div>
          
          <button 
            className="user-profile__dropdown-item"
            onClick={handleLogout}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16,17 21,12 16,7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
