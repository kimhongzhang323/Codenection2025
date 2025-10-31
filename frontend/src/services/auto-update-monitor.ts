import { changelogApi } from './api'
import type { GitHubCommit } from './api'

interface AutoUpdateConfig {
  repoUrl: string
  branch: string
  checkInterval: number // minutes
  lastCommitSha?: string
  onUpdate?: (commits: GitHubCommit[]) => void
  onError?: (error: Error) => void
}

export interface UpdateNotification {
  type: 'content-update' | 'new-commits' | 'branch-change'
  data: {
    newCommits?: GitHubCommit[]
    branch?: string
    timestamp: string
    repoUrl: string
  }
}

class AutoUpdateMonitor {
  private static instance: AutoUpdateMonitor
  private configs: Map<string, AutoUpdateConfig> = new Map()
  private intervals: Map<string, number> = new Map()
  private updateCallbacks: Set<(notification: UpdateNotification) => void> = new Set()
  private isActive = false

  private constructor() {
    this.loadPersistedState()
    this.setupVisibilityHandling()
  }

  static getInstance(): AutoUpdateMonitor {
    if (!AutoUpdateMonitor.instance) {
      AutoUpdateMonitor.instance = new AutoUpdateMonitor()
    }
    return AutoUpdateMonitor.instance
  }

  private loadPersistedState(): void {
    try {
      const saved = localStorage.getItem('auto_update_configs')
      if (saved) {
        const configs = JSON.parse(saved)
        Object.entries(configs).forEach(([key, config]) => {
          this.configs.set(key, config as AutoUpdateConfig)
        })
      }
    } catch (error) {
      console.error('Failed to load auto-update configs:', error)
    }
  }

  private persistState(): void {
    try {
      const configsObj = Object.fromEntries(
        Array.from(this.configs.entries()).map(([key, config]) => [
          key, 
          { ...config, onUpdate: undefined, onError: undefined } // Don't persist callbacks
        ])
      )
      localStorage.setItem('auto_update_configs', JSON.stringify(configsObj))
    } catch (error) {
      console.error('Failed to persist auto-update configs:', error)
    }
  }

  private setupVisibilityHandling(): void {
    // Pause monitoring when tab is not visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseMonitoring()
      } else {
        this.resumeMonitoring()
      }
    })

    // Handle page focus/blur
    window.addEventListener('focus', () => {
      this.resumeMonitoring()
      // Check for updates immediately when page becomes focused
      this.checkAllRepositories()
    })

    window.addEventListener('blur', () => {
      this.pauseMonitoring()
    })
  }

  addRepository(
    repoUrl: string, 
    branch: string = 'main', 
    checkInterval: number = 2, // 2 minutes default
    callbacks?: {
      onUpdate?: (commits: GitHubCommit[]) => void
      onError?: (error: Error) => void
    }
  ): void {
    const config: AutoUpdateConfig = {
      repoUrl,
      branch,
      checkInterval,
      onUpdate: callbacks?.onUpdate,
      onError: callbacks?.onError
    }

    this.configs.set(repoUrl, config)
    this.persistState()

    if (this.isActive) {
      this.startMonitoring(repoUrl)
    }

    // Initial check to get baseline
    this.checkRepository(repoUrl, true)
  }

  removeRepository(repoUrl: string): void {
    this.stopMonitoring(repoUrl)
    this.configs.delete(repoUrl)
    this.persistState()
  }

  updateRepositoryBranch(repoUrl: string, newBranch: string): void {
    const config = this.configs.get(repoUrl)
    if (config) {
      config.branch = newBranch
      config.lastCommitSha = undefined // Reset to get new baseline
      this.persistState()
      
      // Restart monitoring with new branch
      this.stopMonitoring(repoUrl)
      this.startMonitoring(repoUrl)
      
      // Notify about branch change
      this.notifyUpdateCallbacks({
        type: 'branch-change',
        data: {
          branch: newBranch,
          timestamp: new Date().toISOString(),
          repoUrl
        }
      })
    }
  }

  startAutoUpdate(): void {
    this.isActive = true
    this.configs.forEach((_, repoUrl) => {
      this.startMonitoring(repoUrl)
    })
  }

  stopAutoUpdate(): void {
    this.isActive = false
    this.intervals.forEach((intervalId) => {
      clearInterval(intervalId)
    })
    this.intervals.clear()
  }

  private startMonitoring(repoUrl: string): void {
    const config = this.configs.get(repoUrl)
    if (!config || !this.isActive) return

    // Clear existing interval
    this.stopMonitoring(repoUrl)

    // Set up new interval
    const intervalId = window.setInterval(
      () => this.checkRepository(repoUrl),
      config.checkInterval * 60 * 1000
    )

    this.intervals.set(repoUrl, intervalId)
    console.log(`Started auto-update monitoring for ${repoUrl} (${config.checkInterval}min intervals)`)
  }

  private stopMonitoring(repoUrl: string): void {
    const intervalId = this.intervals.get(repoUrl)
    if (intervalId) {
      clearInterval(intervalId)
      this.intervals.delete(repoUrl)
    }
  }

  private pauseMonitoring(): void {
    this.intervals.forEach((intervalId) => {
      clearInterval(intervalId)
    })
    this.intervals.clear()
  }

  private resumeMonitoring(): void {
    if (this.isActive) {
      this.configs.forEach((_, repoUrl) => {
        this.startMonitoring(repoUrl)
      })
    }
  }

  private async checkRepository(repoUrl: string, isInitial: boolean = false): Promise<void> {
    const config = this.configs.get(repoUrl)
    if (!config) return

    try {
      console.log(`Checking for updates in ${repoUrl} (branch: ${config.branch})`)
      
      const commits = await githubApi.getCommits(repoUrl, config.branch, 1, 10)
      
      if (commits.length === 0) {
        console.log(`No commits found in ${repoUrl}`)
        return
      }

      const latestCommit = commits[0]
      const lastKnownSha = config.lastCommitSha

      // Update the last known commit SHA
      config.lastCommitSha = latestCommit.sha
      this.persistState()

      // Skip notification on initial check
      if (isInitial || !lastKnownSha) {
        console.log(`Initial check for ${repoUrl}, baseline set to ${latestCommit.sha}`)
        return
      }

      // Check if there are new commits
      if (lastKnownSha !== latestCommit.sha) {
        // Find all new commits since last check
        const newCommits: GitHubCommit[] = []
        for (const commit of commits) {
          if (commit.sha === lastKnownSha) break
          newCommits.push(commit)
        }

        if (newCommits.length > 0) {
          console.log(`Found ${newCommits.length} new commits in ${repoUrl}`)
          
          // Call repository-specific callback
          if (config.onUpdate) {
            config.onUpdate(newCommits)
          }

          // Notify all registered update callbacks
          this.notifyUpdateCallbacks({
            type: 'new-commits',
            data: {
              newCommits,
              timestamp: new Date().toISOString(),
              repoUrl
            }
          })

          // Trigger content update notification after a short delay
          setTimeout(() => {
            this.notifyUpdateCallbacks({
              type: 'content-update',
              data: {
                newCommits,
                timestamp: new Date().toISOString(),
                repoUrl
              }
            })
          }, 1000)
        }
      }
    } catch (error) {
      console.error(`Failed to check repository ${repoUrl}:`, error)
      
      if (config.onError) {
        config.onError(error as Error)
      }
    }
  }

  private async checkAllRepositories(): Promise<void> {
    const promises = Array.from(this.configs.keys()).map(repoUrl => 
      this.checkRepository(repoUrl)
    )
    
    await Promise.allSettled(promises)
  }

  // Manual trigger methods
  async forceCheck(repoUrl?: string): Promise<void> {
    if (repoUrl) {
      await this.checkRepository(repoUrl)
    } else {
      await this.checkAllRepositories()
    }
  }

  // Callback management
  onUpdate(callback: (notification: UpdateNotification) => void): () => void {
    this.updateCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback)
    }
  }

  private notifyUpdateCallbacks(notification: UpdateNotification): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(notification)
      } catch (error) {
        console.error('Error in update callback:', error)
      }
    })
  }

  // Status methods
  getMonitoredRepositories(): string[] {
    return Array.from(this.configs.keys())
  }

  getRepositoryStatus(repoUrl: string): {
    isMonitored: boolean
    branch?: string
    lastCheck?: string
    lastCommitSha?: string
    checkInterval?: number
  } {
    const config = this.configs.get(repoUrl)
    if (!config) {
      return { isMonitored: false }
    }

    return {
      isMonitored: true,
      branch: config.branch,
      lastCommitSha: config.lastCommitSha,
      checkInterval: config.checkInterval
    }
  }

  isMonitoringActive(): boolean {
    return this.isActive
  }
}

export const autoUpdateMonitor = AutoUpdateMonitor.getInstance()
