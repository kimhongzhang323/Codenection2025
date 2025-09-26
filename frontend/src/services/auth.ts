// Authentication Service
class AuthService {
  private static instance: AuthService;
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    return !!(token && userId);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  getUserEmail(): string | null {
    return localStorage.getItem('user_email');
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
  }

  async getCurrentUser(): Promise<{ id: string; email: string; [key: string]: unknown }> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch('http://localhost:8081/api/auth/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Authentication expired');
      }
      throw new Error('Failed to get user information');
    }

    return response.json();
  }

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}

export const authService = AuthService.getInstance();

// Auth Guard Hook
export const useAuth = () => {
  const isAuthenticated = authService.isAuthenticated();
  const token = authService.getToken();
  const userId = authService.getUserId();
  const userEmail = authService.getUserEmail();

  return {
    isAuthenticated,
    token,
    userId,
    userEmail,
    logout: authService.logout.bind(authService),
    getCurrentUser: authService.getCurrentUser.bind(authService),
    getAuthHeaders: authService.getAuthHeaders.bind(authService),
  };
};
