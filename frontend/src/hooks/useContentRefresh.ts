import { useState, useCallback, useRef } from 'react'

interface ContentRefreshOptions {
  onRefresh?: () => void
  refreshDelay?: number // milliseconds
}

export function useContentRefresh({ onRefresh, refreshDelay = 1000 }: ContentRefreshOptions = {}) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return

    setIsRefreshing(true)

    // Clear any existing refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    // Debounce multiple refresh requests
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        if (onRefresh) {
          await onRefresh()
        }
        setLastRefresh(new Date())
      } catch (error) {
        console.error('Content refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }, refreshDelay)
  }, [isRefreshing, onRefresh, refreshDelay])

  const forceRefresh = useCallback(() => {
    // Cancel debouncing and refresh immediately
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    setIsRefreshing(false)
    triggerRefresh()
  }, [triggerRefresh])

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
  }, [])

  return {
    isRefreshing,
    lastRefresh,
    triggerRefresh,
    forceRefresh,
    cleanup
  }
}
