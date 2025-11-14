/**
 * Retry utility for failed async operations
 */

export interface RetryOptions {
  maxRetries?: number
  retryInterval?: number // milliseconds
  onRetry?: (attempt: number, error: Error) => void
  shouldRetry?: (error: Error) => boolean
}

/**
 * Retry an async operation with exponential backoff option
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryInterval = 1000,
    onRetry,
    shouldRetry = () => true,
  } = options

  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry if we've exhausted attempts or if shouldRetry returns false
      if (attempt >= maxRetries || !shouldRetry(lastError)) {
        throw lastError
      }
      
      // Notify about retry
      if (onRetry) {
        onRetry(attempt + 1, lastError)
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryInterval))
    }
  }
  
  throw lastError!
}

/**
 * Create a periodic retry mechanism that keeps retrying until success
 */
export function createPeriodicRetry<T>(
  fn: () => Promise<T>,
  options: {
    interval?: number
    onSuccess?: (result: T) => void
    onError?: (error: Error, retryCount: number) => void
    maxRetries?: number
  } = {}
): {
  start: () => void
  stop: () => void
  getRetryCount: () => number
} {
  const {
    interval = 5000,
    onSuccess,
    onError,
    maxRetries = Infinity,
  } = options
  
  let timerId: number | null = null
  let retryCount = 0
  let isStopped = false
  
  const attempt = async () => {
    if (isStopped) return
    
    try {
      const result = await fn()
      retryCount = 0 // Reset on success
      if (onSuccess) {
        onSuccess(result)
      }
      // Stop retrying on success
      stop()
    } catch (error) {
      retryCount++
      const err = error instanceof Error ? error : new Error(String(error))
      
      if (onError) {
        onError(err, retryCount)
      }
      
      // Schedule next retry if not stopped and within limits
      if (!isStopped && retryCount < maxRetries) {
        timerId = window.setTimeout(attempt, interval)
      }
    }
  }
  
  return {
    start: () => {
      isStopped = false
      retryCount = 0
      attempt()
    },
    stop: () => {
      isStopped = true
      if (timerId !== null) {
        window.clearTimeout(timerId)
        timerId = null
      }
    },
    getRetryCount: () => retryCount,
  }
}
