import { useCallback, useEffect, useRef, useState } from 'react'
import { autoUpdateMonitor, type UpdateNotification } from '../services/auto-update-monitor'
import type { GitHubCommit } from '../services/api'

export interface UseAutoUpdateOptions {
  repoUrl?: string
  branch?: string
  checkInterval?: number // minutes
  autoStart?: boolean
  onNewCommits?: (commits: GitHubCommit[]) => void
  onContentUpdate?: () => void
  onError?: (error: Error) => void
}

export interface UseAutoUpdateReturn {
  isMonitoring: boolean
  lastUpdate: Date | null
  newCommitsCount: number
  latestCommits: GitHubCommit[]
  startMonitoring: () => void
  stopMonitoring: () => void
  forceCheck: () => Promise<void>
  clearNotifications: () => void
  updateBranch: (newBranch: string) => void
}

export function useAutoUpdate({
  repoUrl,
  branch = 'main',
  checkInterval = 2,
  autoStart = true,
  onNewCommits,
  onContentUpdate,
  onError
}: UseAutoUpdateOptions = {}): UseAutoUpdateReturn {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [newCommitsCount, setNewCommitsCount] = useState(0)
  const [latestCommits, setLatestCommits] = useState<GitHubCommit[]>([])
  
  const callbacksRef = useRef({ onNewCommits, onContentUpdate, onError })
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onNewCommits, onContentUpdate, onError }
  }, [onNewCommits, onContentUpdate, onError])

  // Handle update notifications
  const handleUpdateNotification = useCallback((notification: UpdateNotification) => {
    if (!repoUrl || notification.data.repoUrl !== repoUrl) return

    setLastUpdate(new Date(notification.data.timestamp))

    switch (notification.type) {
      case 'new-commits':
        if (notification.data.newCommits) {
          setLatestCommits(prev => {
            const combined = [...notification.data.newCommits!, ...prev]
            // Keep only the latest 10 commits
            return combined.slice(0, 10)
          })
          setNewCommitsCount(prev => prev + notification.data.newCommits!.length)
          
          if (callbacksRef.current.onNewCommits) {
            callbacksRef.current.onNewCommits(notification.data.newCommits)
          }
        }
        break

      case 'content-update':
        if (callbacksRef.current.onContentUpdate) {
          callbacksRef.current.onContentUpdate()
        }
        break

      case 'branch-change':
        // Reset state for new branch
        setLatestCommits([])
        setNewCommitsCount(0)
        setLastUpdate(null)
        break
    }
  }, [repoUrl])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!repoUrl) return

    try {
      // Add repository to monitor
      autoUpdateMonitor.addRepository(
        repoUrl,
        branch,
        checkInterval,
        {
          onUpdate: (commits) => {
            if (callbacksRef.current.onNewCommits) {
              callbacksRef.current.onNewCommits(commits)
            }
          },
          onError: (error) => {
            if (callbacksRef.current.onError) {
              callbacksRef.current.onError(error)
            }
          }
        }
      )

      // Subscribe to update notifications
      unsubscribeRef.current = autoUpdateMonitor.onUpdate(handleUpdateNotification)

      // Start the monitor if not already active
      if (!autoUpdateMonitor.isMonitoringActive()) {
        autoUpdateMonitor.startAutoUpdate()
      }

      setIsMonitoring(true)
    } catch (error) {
      console.error('Failed to start monitoring:', error)
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(error as Error)
      }
    }
  }, [repoUrl, branch, checkInterval, handleUpdateNotification])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!repoUrl) return

    try {
      autoUpdateMonitor.removeRepository(repoUrl)
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }

      setIsMonitoring(false)
    } catch (error) {
      console.error('Failed to stop monitoring:', error)
    }
  }, [repoUrl])

  // Force check
  const forceCheck = useCallback(async () => {
    if (!repoUrl) return

    try {
      await autoUpdateMonitor.forceCheck(repoUrl)
    } catch (error) {
      console.error('Failed to force check:', error)
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(error as Error)
      }
    }
  }, [repoUrl])

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNewCommitsCount(0)
    setLatestCommits([])
  }, [])

  // Update branch
  const updateBranch = useCallback((newBranch: string) => {
    if (!repoUrl) return

    autoUpdateMonitor.updateRepositoryBranch(repoUrl, newBranch)
  }, [repoUrl])

  // Auto-start monitoring when repoUrl is available
  useEffect(() => {
    if (autoStart && repoUrl && !isMonitoring) {
      startMonitoring()
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [autoStart, repoUrl, isMonitoring, startMonitoring])

  // Update monitoring config when branch or interval changes
  useEffect(() => {
    if (isMonitoring && repoUrl) {
      // Restart monitoring with new config
      stopMonitoring()
      setTimeout(() => startMonitoring(), 100)
    }
  }, [branch, checkInterval]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isMonitoring,
    lastUpdate,
    newCommitsCount,
    latestCommits,
    startMonitoring,
    stopMonitoring,
    forceCheck,
    clearNotifications,
    updateBranch
  }
}
