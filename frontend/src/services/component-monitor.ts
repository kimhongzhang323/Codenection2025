import { changelogApi } from './api'
import { discordNotificationService, type ComponentChange } from './discord-notifications'
import type { GitHubCommit } from './api'

interface DependencyMap {
  [component: string]: string[] // component -> list of file patterns it depends on
}

interface MonitoringConfig {
  repoUrl: string
  branch: string
  changelogUrl: string
  checkInterval: number // minutes
  dependencyMap: DependencyMap
  subscribers: string[] // Discord user IDs to mention
}

class ComponentChangeMonitor {
  private static instance: ComponentChangeMonitor
  private monitoringConfigs: Map<string, MonitoringConfig> = new Map()
  private lastCheckedShas: Map<string, string> = new Map()
  private intervalIds: Map<string, number> = new Map()

  private constructor() {
    this.loadPersistedData()
  }

  static getInstance(): ComponentChangeMonitor {
    if (!ComponentChangeMonitor.instance) {
      ComponentChangeMonitor.instance = new ComponentChangeMonitor()
    }
    return ComponentChangeMonitor.instance
  }

  private loadPersistedData(): void {
    const savedConfigs = localStorage.getItem('component_monitoring_configs')
    if (savedConfigs) {
      try {
        const configs = JSON.parse(savedConfigs)
        this.monitoringConfigs = new Map(Object.entries(configs))
      } catch (error) {
        console.error('Failed to load monitoring configs:', error)
      }
    }

    const savedShas = localStorage.getItem('component_monitoring_last_shas')
    if (savedShas) {
      try {
        const shas = JSON.parse(savedShas)
        this.lastCheckedShas = new Map(Object.entries(shas))
      } catch (error) {
        console.error('Failed to load last checked SHAs:', error)
      }
    }
  }

  private persistData(): void {
    localStorage.setItem(
      'component_monitoring_configs',
      JSON.stringify(Object.fromEntries(this.monitoringConfigs))
    )
    localStorage.setItem(
      'component_monitoring_last_shas',
      JSON.stringify(Object.fromEntries(this.lastCheckedShas))
    )
  }

  addMonitoring(repoUrl: string, config: Omit<MonitoringConfig, 'repoUrl'>): void {
    const fullConfig: MonitoringConfig = {
      repoUrl,
      ...config
    }

    this.monitoringConfigs.set(repoUrl, fullConfig)
    this.persistData()

    // Start monitoring
    this.startMonitoring(repoUrl)
  }

  removeMonitoring(repoUrl: string): void {
    this.stopMonitoring(repoUrl)
    this.monitoringConfigs.delete(repoUrl)
    this.lastCheckedShas.delete(repoUrl)
    this.persistData()
  }

  private startMonitoring(repoUrl: string): void {
    const config = this.monitoringConfigs.get(repoUrl)
    if (!config) return

    // Clear existing interval if any
    this.stopMonitoring(repoUrl)

    // Set up periodic checking
    const intervalId = window.setInterval(
      () => this.checkForChanges(repoUrl),
      config.checkInterval * 60 * 1000
    )
    
    this.intervalIds.set(repoUrl, intervalId)

    // Initial check
    this.checkForChanges(repoUrl)
  }

  private stopMonitoring(repoUrl: string): void {
    const intervalId = this.intervalIds.get(repoUrl)
    if (intervalId) {
      clearInterval(intervalId)
      this.intervalIds.delete(repoUrl)
    }
  }

  async checkForChanges(repoUrl: string): Promise<void> {
    const config = this.monitoringConfigs.get(repoUrl)
    if (!config) return

    try {
      console.log(`Checking for component changes in ${repoUrl}...`)
      
      // Get recent commits
      const commits = await changelogApi.getCommits(repoUrl, config.branch, 1, 20)
      
      if (commits.length === 0) return

      const lastCheckedSha = this.lastCheckedShas.get(repoUrl)
      const latestSha = commits[0].sha

      // Update last checked SHA
      this.lastCheckedShas.set(repoUrl, latestSha)
      this.persistData()

      // If this is the first check, don't notify
      if (!lastCheckedSha) {
        console.log(`First check for ${repoUrl}, skipping notifications`)
        return
      }

      // If no new commits, return
      if (lastCheckedSha === latestSha) {
        console.log(`No new commits in ${repoUrl}`)
        return
      }

      // Find new commits since last check
      const newCommits = []
      for (const commit of commits) {
        if (commit.sha === lastCheckedSha) break
        newCommits.push(commit)
      }

      if (newCommits.length === 0) return

      console.log(`Found ${newCommits.length} new commits in ${repoUrl}`)

      // Analyze commits for component changes
      const componentChanges = await this.analyzeCommitsForComponentChanges(newCommits, config)

      if (componentChanges.length > 0) {
        console.log(`Detected ${componentChanges.length} component changes, sending Discord notification`)
        
        if (componentChanges.length === 1) {
          await discordNotificationService.notifyComponentChange(componentChanges[0])
        } else {
          const repoName = this.extractRepoName(repoUrl)
          await discordNotificationService.notifyMultipleChanges(componentChanges, repoName)
        }
      }
    } catch (error) {
      console.error(`Failed to check for changes in ${repoUrl}:`, error)
    }
  }

  private async analyzeCommitsForComponentChanges(
    commits: GitHubCommit[],
    config: MonitoringConfig
  ): Promise<ComponentChange[]> {
    const componentChanges: ComponentChange[] = []

    for (const commit of commits) {
      const files = commit.files || []
      const changedComponents = new Set<string>()

      // Check which components are affected by the changed files
      for (const [component, patterns] of Object.entries(config.dependencyMap)) {
        const isAffected = patterns.some(pattern => 
          files.some(file => this.matchPattern(file.filename, pattern))
        )

        if (isAffected) {
          changedComponents.add(component)
        }
      }

      // Create change records for affected components
      for (const component of changedComponents) {
        const componentFiles = files
          .filter(file => 
            config.dependencyMap[component].some(pattern => 
              this.matchPattern(file.filename, pattern)
            )
          )
          .map(file => file.filename)

        const changeType = this.determineChangeType(files, componentFiles)

        componentChanges.push({
          component,
          type: changeType,
          files: componentFiles,
          commitSha: commit.sha,
          commitMessage: commit.commit.message.split('\n')[0], // First line only
          author: commit.commit.author.name,
          timestamp: commit.commit.author.date,
          changelogUrl: `${config.changelogUrl}?highlight=${commit.sha}`
        })
      }
    }

    return componentChanges
  }

  private matchPattern(filename: string, pattern: string): boolean {
    // Convert glob-like pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    
    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(filename)
  }

  private determineChangeType(allFiles: Array<{filename: string, status: string}>, componentFiles: string[]): 'added' | 'modified' | 'removed' {
    const hasAdded = allFiles.some(f => componentFiles.includes(f.filename) && f.status === 'added')
    const hasRemoved = allFiles.some(f => componentFiles.includes(f.filename) && f.status === 'removed')
    
    if (hasAdded) return 'added'
    if (hasRemoved) return 'removed'
    return 'modified'
  }

  private extractRepoName(repoUrl: string): string {
    try {
      const url = new URL(repoUrl)
      const pathParts = url.pathname.split('/').filter(Boolean)
      return pathParts.length >= 2 ? `${pathParts[0]}/${pathParts[1]}` : 'Repository'
    } catch {
      return 'Repository'
    }
  }

  getMonitoringConfigs(): Map<string, MonitoringConfig> {
    return new Map(this.monitoringConfigs)
  }

  isMonitoring(repoUrl: string): boolean {
    return this.monitoringConfigs.has(repoUrl)
  }

  async forceCheck(repoUrl: string): Promise<void> {
    await this.checkForChanges(repoUrl)
  }

  // Predefined dependency maps for common frameworks
  static getFrameworkDependencyMap(framework: 'react' | 'vue' | 'angular' | 'svelte'): DependencyMap {
    switch (framework) {
      case 'react':
        return {
          'React Components': ['src/components/**/*.tsx', 'src/components/**/*.jsx'],
          'Hooks': ['src/hooks/**/*.ts', 'src/hooks/**/*.tsx'],
          'Pages': ['src/pages/**/*.tsx', 'src/pages/**/*.jsx'],
          'Services': ['src/services/**/*.ts'],
          'Utils': ['src/utils/**/*.ts', 'src/lib/**/*.ts'],
          'Styles': ['src/**/*.css', 'src/**/*.scss', 'src/**/*.module.css'],
          'Configuration': ['package.json', 'tsconfig.json', 'vite.config.*', 'webpack.config.*']
        }
      case 'vue':
        return {
          'Vue Components': ['src/components/**/*.vue'],
          'Composables': ['src/composables/**/*.ts'],
          'Pages': ['src/pages/**/*.vue', 'src/views/**/*.vue'],
          'Services': ['src/services/**/*.ts'],
          'Utils': ['src/utils/**/*.ts'],
          'Styles': ['src/**/*.css', 'src/**/*.scss', 'src/**/*.vue'],
          'Configuration': ['package.json', 'tsconfig.json', 'vite.config.*', 'vue.config.*']
        }
      case 'angular':
        return {
          'Angular Components': ['src/app/**/*.component.ts', 'src/app/**/*.component.html'],
          'Services': ['src/app/**/*.service.ts'],
          'Modules': ['src/app/**/*.module.ts'],
          'Guards': ['src/app/**/*.guard.ts'],
          'Pipes': ['src/app/**/*.pipe.ts'],
          'Styles': ['src/**/*.css', 'src/**/*.scss'],
          'Configuration': ['package.json', 'tsconfig.json', 'angular.json']
        }
      case 'svelte':
        return {
          'Svelte Components': ['src/**/*.svelte'],
          'Stores': ['src/stores/**/*.ts'],
          'Routes': ['src/routes/**/*.svelte'],
          'Services': ['src/services/**/*.ts'],
          'Utils': ['src/utils/**/*.ts'],
          'Styles': ['src/**/*.css', 'src/**/*.scss'],
          'Configuration': ['package.json', 'tsconfig.json', 'svelte.config.*', 'vite.config.*']
        }
      default:
        return {}
    }
  }
}

export const componentChangeMonitor = ComponentChangeMonitor.getInstance()
export type { MonitoringConfig, DependencyMap }
