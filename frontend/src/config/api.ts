/*
* API Configuration
* Centralized configuration for all API endpoints 
*/

// Get base URL from environment variable or fallback to localhost
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // Fallback based on environment
  if (import.meta.env.PROD) {
    // In production, you should set VITE_API_BASE_URL
    console.warn('VITE_API_BASE_URL not set in production environment');
    return 'https://your-backend-domain.com/api';
  }
  
  return 'http://localhost:8081/api';
};

// Get backend base URL (without /api suffix) for OAuth endpoints
const getBackendBaseUrl = (): string => {
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace('/api', '');
};

export const API_CONFIG = {
  // Base URLs
  API_BASE_URL: getApiBaseUrl(),
  BACKEND_BASE_URL: getBackendBaseUrl(),
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: {
      VALIDATE: '/auth/validate',
      USER: '/auth/user',
      LOGOUT: '/auth/logout',
      SUCCESS: '/auth/success',
      // OAuth endpoints (these are handled by Spring Security, not under /api)
      OAUTH_GITHUB: '/oauth2/authorization/github',
    },
    
    // Documentation
    DOCUMENTATION: '/documentation',
    
    // Agent
    AGENT: '/agent',
    
    // Config
    CONFIG: '/config',
    
    // Other endpoints...
  }
} as const;

// Helper functions
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.API_BASE_URL}${endpoint}`;
};

export const getBackendUrl = (endpoint: string): string => {
  return `${API_CONFIG.BACKEND_BASE_URL}${endpoint}`;
};

// OAuth specific helper
export const getOAuthUrl = (provider: 'github', redirectUri: string): string => {
  // Currently only GitHub is supported, but provider param allows future expansion
  const oauthEndpoint = provider === 'github' ? API_CONFIG.ENDPOINTS.AUTH.OAUTH_GITHUB : API_CONFIG.ENDPOINTS.AUTH.OAUTH_GITHUB;
  const baseUrl = getBackendUrl(oauthEndpoint);
  return `${baseUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`;
};
