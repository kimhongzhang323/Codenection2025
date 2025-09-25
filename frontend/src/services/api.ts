// API Configuration
const API_BASE_URL = 'http://localhost:8081/api'

// Types matching your backend models
export interface Documentation {
  content: string
  lastUpdated: string
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

// Documentation API Service
export const documentationApi = {
  // Get all documentation for a repository
  async getAll(gitUrl: string, branch?: string): Promise<Record<string, Documentation>> {
    const params = new URLSearchParams({ gitUrl })
    if (branch) params.append('branch', branch)
    
    const response = await fetch(`${API_BASE_URL}/documentation?${params}`)
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
  async runSummary(gitUrl: string, branch?: string): Promise<string> {
    const request: AgentRequest = { gitUrl, userPrompt: '', branch }
    
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

// Utility function to parse GitHub URL
export function parseGitUrl(gitUrl: string): { owner: string; name: string } {
  const httpsMatch = gitUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/)
  const sshMatch = gitUrl.match(/git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/)
  
  let owner: string, name: string
  
  if (httpsMatch) {
    owner = httpsMatch[1]
    name = httpsMatch[2]
  } else if (sshMatch) {
    owner = sshMatch[1]
    name = sshMatch[2]
  } else {
    throw new Error('Invalid GitHub URL format')
  }
  
  return { owner, name }
}
