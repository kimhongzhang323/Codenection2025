import { authService } from './auth';

// API Configuration
import { API_CONFIG } from '../config/api'

const API_BASE_URL = API_CONFIG.API_BASE_URL

// Helper function to get authenticated headers
const getAuthHeaders = (): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
    ...authService.getAuthHeaders(),
  };
};

// Types matching your backend models
export interface Documentation {
  content: string
  lastUpdated: string
}

// GitHub Commit types
export interface GitHubCommit {
  sha: string
  node_id: string
  commit: {
    author: {
      name: string
      email: string
      date: string
    }
    committer: {
      name: string
      email: string
      date: string
    }
    message: string
    tree: {
      sha: string
      url: string
    }
    url: string
    comment_count: number
  }
  url: string
  html_url: string
  comments_url: string
  author: {
    login: string
    id: number
    avatar_url: string
    html_url: string
  } | null
  committer: {
    login: string
    id: number
    avatar_url: string
    html_url: string
  } | null
  parents: Array<{
    sha: string
    url: string
    html_url: string
  }>
  stats?: {
    total: number
    additions: number
    deletions: number
  }
  files?: Array<{
    sha: string
    filename: string
    status: string
    additions: number
    deletions: number
    changes: number
    patch?: string
  }>
}

export interface GitHubCommitSearchResult {
  total_count: number
  incomplete_results: boolean
  items: GitHubCommit[]
}

export interface ApiResponse<T> {
  status: string
  message: string
  data: T
}

export interface AgentRequest {
  gitUrl: string
  userPrompt: string
  branch?: string
}

export interface DocAgentRequest extends AgentRequest {
  audience?: string
  tone?: string
  format?: string
  sections?: string[]
}

// Configuration types
export interface DocumentConfig {
  audience: string
  tone: string
  documentationTemplate: string
  extra?: Record<string, unknown>
}

export interface ConfigResponse {
  gitUrl: string
  branch: string
  config: DocumentConfig
}

// Documentation API Service
export const documentationApi = {
  // Get all documentation for a repository
  async getAll(gitUrl: string, branch?: string): Promise<Record<string, Documentation>> {
    const params = new URLSearchParams({ gitUrl })
    if (branch) params.append('branch', branch)
    
    const response = await fetch(`${API_BASE_URL}/documentation?${params}`, {
      headers: getAuthHeaders(),
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch documentation: ${response.statusText}`)
    }
    
    return response.json()
  },

  // Get single documentation by key
  async get(gitUrl: string, key: string, branch?: string): Promise<Documentation> {
    const params = new URLSearchParams({ gitUrl, key })
    if (branch) params.append('branch', branch)
    
    const response = await fetch(`${API_BASE_URL}/documentation/single?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch documentation for ${key}: ${response.statusText}`)
    }
    
    return response.json()
  },

  // Create new documentation
  async create(gitUrl: string, key: string, content: string, branch?: string): Promise<void> {
    const params = new URLSearchParams({ gitUrl, key })
    if (branch) params.append('branch', branch)
    
    const response = await fetch(`${API_BASE_URL}/documentation/single?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(content),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to create documentation: ${response.statusText}`)
    }
  },

  // Update existing documentation
  async update(gitUrl: string, key: string, content: string, branch?: string): Promise<void> {
    const params = new URLSearchParams({ gitUrl, key })
    if (branch) params.append('branch', branch)
    
    const response = await fetch(`${API_BASE_URL}/documentation/single?${params}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(content),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update documentation: ${response.statusText}`)
    }
  },

  // Delete documentation
  async delete(gitUrl: string, key: string, branch?: string): Promise<void> {
    const params = new URLSearchParams({ gitUrl, key })
    if (branch) params.append('branch', branch)
    
    const response = await fetch(`${API_BASE_URL}/documentation/single?${params}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      throw new Error(`Failed to delete documentation: ${response.statusText}`)
    }
  },
}

// Agent API Service
export const agentApi = {
  // Get general agent response
  async getResponse(request: AgentRequest): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/agent/get-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get agent response: ${response.statusText}`)
    }
    
    const result: ApiResponse<string> = await response.json()
    if (result.status === 'ERROR') {
      throw new Error(result.message)
    }
    
    return result.data
  },

  // Run summary generation
  async runSummary(gitUrl: string, branch?: string, pageContent?: string): Promise<string> {
    const request: AgentRequest = { gitUrl, userPrompt: pageContent || '', branch }
    
    const response = await fetch(`${API_BASE_URL}/agent/run-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to run summary: ${response.statusText}`)
    }
    
    const result: ApiResponse<string> = await response.json()
    if (result.status === 'ERROR') {
      throw new Error(result.message)
    }
    
    return result.data
  },

  // Run documentation generation
  async runDocumentation(request: DocAgentRequest): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/agent/run-doc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to run documentation generation: ${response.statusText}`)
    }
    
    const result: ApiResponse<string> = await response.json()
    if (result.status === 'ERROR') {
      throw new Error(result.message)
    }
    
    return result.data
  },
}

// GitHub Repository Interface
export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  private: boolean
  stargazers_count: number
  language: string | null
  updated_at: string
}

// GitHub API Service
export const githubApi = {
  // Get user's repositories
  async getUserRepositories(): Promise<GitHubRepository[]> {
    const accessToken = localStorage.getItem('github_access_token')
    if (!accessToken) {
      throw new Error('No GitHub access token available')
    }

    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.statusText}`)
    }

    return response.json()
  },

  // Search user's repositories
  async searchUserRepositories(query: string): Promise<GitHubRepository[]> {
    const accessToken = localStorage.getItem('github_access_token')
    if (!accessToken) {
      throw new Error('No GitHub access token available')
    }

    const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+user:@me&sort=updated`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to search repositories: ${response.statusText}`)
    }

    const data = await response.json()
    return data.items || []
  },
}

// User interface
export interface UserData {
  id: number
  githubId: string
  email: string
  name: string
  username: string
  avatarUrl: string
  accessToken?: string
}

// User API Service  
export const userApi = {
  // Get current user info including repositories
  async getCurrentUser(): Promise<{ user: UserData; repositories: GitHubRepository[] }> {
    const response = await fetch(`${API_BASE_URL}/auth/user`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Extract user data from the response
    const userData = result.data?.user || result.user
    
    // Store GitHub access token if available
    if (userData?.accessToken) {
      localStorage.setItem('github_access_token', userData.accessToken)
    }

    return {
      user: userData,
      repositories: [] // Don't fetch repositories here to avoid circular dependency
    }
  },
}



// Utility function to parse GitHub URL
export function parseGitUrl(gitUrl: string): { owner: string; name: string } {
  if (!gitUrl || typeof gitUrl !== 'string') {
    throw new Error('Invalid GitHub URL: URL is required and must be a string')
  }

  console.log('Parsing Git URL:', gitUrl)

  // Handle different GitHub URL formats
  const httpsMatch = gitUrl.match(/https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/)
  const sshMatch = gitUrl.match(/git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/)
  const shortMatch = gitUrl.match(/^([^/]+)\/([^/]+)$/) // owner/repo format
  
  console.log('URL matches:', { httpsMatch, sshMatch, shortMatch })
  
  let owner: string, name: string
  
  if (httpsMatch) {
    owner = httpsMatch[1]
    name = httpsMatch[2]
  } else if (sshMatch) {
    owner = sshMatch[1]
    name = sshMatch[2]
  } else if (shortMatch) {
    // Handle simple owner/repo format
    owner = shortMatch[1]
    name = shortMatch[2]
  } else {
    throw new Error(`Invalid GitHub URL format: "${gitUrl}". Expected formats: https://github.com/owner/repo, git@github.com:owner/repo, or owner/repo`)
  }

  // Validate owner and name
  if (!owner || !name || owner.trim() === '' || name.trim() === '') {
    throw new Error(`Invalid GitHub URL format: owner and repository name are required`)
  }
  
  const result = { owner: owner.trim(), name: name.trim() }
  console.log('Parsed Git URL result:', result)
  return result
}

// Configuration API Service
export const configApi = {
  // Get configuration for a repository
  async get(gitUrl: string, branch: string = 'main'): Promise<ConfigResponse> {
    const params = new URLSearchParams({ 
      gitUrl, 
      branch 
    })
    
    const response = await fetch(`${API_BASE_URL}/config?${params}`, {
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch configuration: ${response.statusText}`)
    }
    
    return response.json()
  },

  // Set configuration for a repository
  async set(gitUrl: string, branch: string = 'main', config: DocumentConfig): Promise<ConfigResponse> {
    const params = new URLSearchParams({ 
      gitUrl, 
      branch 
    })
    
    const response = await fetch(`${API_BASE_URL}/config?${params}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to set configuration: ${response.statusText}`)
    }
    
    return response.json()
  },

  // Update partial configuration
  async update(gitUrl: string, branch: string = 'main', partialConfig: Partial<DocumentConfig>): Promise<ConfigResponse> {
    const params = new URLSearchParams({ 
      gitUrl, 
      branch 
    })
    
    const response = await fetch(`${API_BASE_URL}/config?${params}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(partialConfig),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update configuration: ${response.statusText}`)
    }
    
    return response.json()
  }
}
