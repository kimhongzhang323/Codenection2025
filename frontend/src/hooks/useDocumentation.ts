import { useState, useEffect, useCallback, useRef } from 'react'
import { documentationApi, agentApi } from '../services/api'
import type { Documentation, DocAgentRequest } from '../services/api'

export interface DocItem {
  type: 'separator' | 'file' | 'folder'
  label: string
  href?: string
  children?: DocItem[]
}

export interface UseDocumentationOptions {
  gitUrl?: string
  branch?: string
  autoLoad?: boolean
  retryInterval?: number // milliseconds between retry attempts (default: 5000)
  maxRetries?: number // max retry attempts (default: unlimited)
}

export interface UseDocumentationReturn {
  documentation: Record<string, Documentation>
  docTree: DocItem[]
  isLoading: boolean
  isGenerating: boolean
  error: string | null
  retryCount: number
  loadDocumentation: () => Promise<void>
  generateDocumentation: (options: Omit<DocAgentRequest, 'gitUrl' | 'branch'>) => Promise<void>
  getDocumentationContent: (key: string) => Promise<string | null>
  updateDocumentation: (key: string, content: string) => Promise<void>
  deleteDocumentation: (key: string) => Promise<void>
  clearError: () => void
  stopRetrying: () => void
}

export function useDocumentation({
  gitUrl,
  branch,
  autoLoad = false,
  retryInterval = 5000,
  maxRetries = Infinity,
}: UseDocumentationOptions = {}): UseDocumentationReturn {
  const [documentation, setDocumentation] = useState<Record<string, Documentation>>({})
  const [docTree, setDocTree] = useState<DocItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const retryTimerRef = useRef<number | null>(null)
  const shouldRetryRef = useRef(true)
  const retryCountRef = useRef(0)

  // Generate doc tree from documentation keys
  const generateDocTree = useCallback((docs: Record<string, Documentation>): DocItem[] => {
    const keys = Object.keys(docs)
    const tree: DocItem[] = []
    
    // Group by categories/sections
    const categories = new Map<string, string[]>()
    const standaloneFiles: string[] = []
    
    keys.forEach(key => {
      if (key.includes('/')) {
        const [category, ...rest] = key.split('/')
        const fileName = rest.join('/')
        if (!categories.has(category)) {
          categories.set(category, [])
        }
        categories.get(category)!.push(fileName)
      } else {
        standaloneFiles.push(key)
      }
    })
    
    // Add standalone files first
    if (standaloneFiles.length > 0) {
      tree.push({ type: 'separator', label: 'Documentation' })
      standaloneFiles.forEach(file => {
        tree.push({ type: 'file', label: file, href: file })
      })
    }
    
    // Add categorized files
    categories.forEach((files, category) => {
      tree.push({ type: 'separator', label: category })
      if (files.length === 1) {
        tree.push({ type: 'file', label: files[0], href: `${category}/${files[0]}` })
      } else {
        const children: DocItem[] = files.map(file => ({
          type: 'file',
          label: file,
          href: `${category}/${file}`,
        }))
        tree.push({ type: 'folder', label: category, children })
      }
    })
    
    return tree
  }, [])

  // Load documentation from API with retry logic
  const loadDocumentation = useCallback(async () => {
    if (!gitUrl) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const docs = await documentationApi.getAll(gitUrl, branch)
      setDocumentation(docs)
      setDocTree(generateDocTree(docs))
      
      // Reset retry count on success
      retryCountRef.current = 0
      setRetryCount(0)
      shouldRetryRef.current = true // Re-enable retrying for future errors
      
      // Clear any pending retry timer
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documentation'
      setError(errorMessage)
      
      // Increment retry count
      retryCountRef.current += 1
      const currentRetry = retryCountRef.current
      setRetryCount(currentRetry)
      
      // Schedule retry if enabled and within limits
      if (shouldRetryRef.current && currentRetry < maxRetries) {
        console.log(`Documentation fetch failed. Retrying in ${retryInterval}ms... (Attempt ${currentRetry}/${maxRetries === Infinity ? '∞' : maxRetries})`)
        
        retryTimerRef.current = window.setTimeout(() => {
          loadDocumentation()
        }, retryInterval)
      } else if (currentRetry >= maxRetries) {
        console.error('Max retry attempts reached. Stopped retrying.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [gitUrl, branch, generateDocTree, maxRetries, retryInterval])

  // Generate new documentation using agent
  const generateDocumentation = useCallback(async (options: Omit<DocAgentRequest, 'gitUrl' | 'branch'>) => {
    if (!gitUrl) return
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const request: DocAgentRequest = {
        ...options,
        gitUrl,
        branch,
      }
      
      await agentApi.runDocumentation(request)
      // After generation, reload the documentation
      await loadDocumentation()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate documentation')
    } finally {
      setIsGenerating(false)
    }
  }, [gitUrl, branch, loadDocumentation])

  // Get content for a specific documentation key
  const getDocumentationContent = useCallback(async (key: string): Promise<string | null> => {
    if (!gitUrl) return null
    
    try {
      // First check if we already have it in memory
      const cached = documentation[key]
      if (cached) {
        return cached.content
      }
      
      // Otherwise fetch from API
      const doc = await documentationApi.get(gitUrl, key, branch)
      
      // Update our local state
      setDocumentation(prev => ({ ...prev, [key]: doc }))
      
      return doc.content
    } catch (err) {
      console.error(`Failed to get documentation for ${key}:`, err)
      return null
    }
  }, [gitUrl, branch, documentation])

  // Update documentation
  const updateDocumentation = useCallback(async (key: string, content: string) => {
    if (!gitUrl) return
    
    try {
      await documentationApi.update(gitUrl, key, content, branch)
      
      // Update local state
      const doc: Documentation = {
        content,
        lastUpdated: new Date().toISOString(),
      }
      setDocumentation(prev => ({ ...prev, [key]: doc }))
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update documentation')
      throw err
    }
  }, [gitUrl, branch])

  // Delete documentation
  const deleteDocumentation = useCallback(async (key: string) => {
    if (!gitUrl) return
    
    try {
      await documentationApi.delete(gitUrl, key, branch)
      
      // Update local state
      setDocumentation(prev => {
        const newDocs = { ...prev }
        delete newDocs[key]
        return newDocs
      })
      setDocTree(generateDocTree(documentation))
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete documentation')
      throw err
    }
  }, [gitUrl, branch, documentation, generateDocTree])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Stop retrying
  const stopRetrying = useCallback(() => {
    shouldRetryRef.current = false
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    retryCountRef.current = 0
    setRetryCount(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current)
      }
    }
  }, [])

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && gitUrl) {
      loadDocumentation()
    }
  }, [autoLoad, loadDocumentation, gitUrl])

  return {
    documentation,
    docTree,
    isLoading,
    isGenerating,
    error,
    retryCount,
    loadDocumentation,
    generateDocumentation,
    getDocumentationContent,
    updateDocumentation,
    deleteDocumentation,
    clearError,
    stopRetrying,
  }
}
