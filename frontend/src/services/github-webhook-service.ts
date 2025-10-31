import { discordNotificationService } from './discord-notifications'

interface SimpleCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
  }
  files?: Array<{
    filename: string
    status: 'added' | 'modified' | 'removed'
  }>
}

export interface GitHubWebhookPayload {
  ref: string
  before: string
  after: string
  repository: {
    id: number
    name: string
    full_name: string
    html_url: string
    clone_url: string
  }
  pusher: {
    name: string
    email: string
  }
  commits: Array<{
    id: string
    tree_id: string
    distinct: boolean
    message: string
    timestamp: string
    url: string
    author: {
      name: string
      email: string
      username?: string
    }
    committer: {
      name: string
      email: string
      username?: string
    }
    added: string[]
    removed: string[]
    modified: string[]
  }>
  head_commit: {
    id: string
    tree_id: string
    distinct: boolean
    message: string
    timestamp: string
    url: string
    author: {
      name: string
      email: string
      username?: string
    }
    committer: {
      name: string
      email: string
      username?: string
    }
    added: string[]
    removed: string[]
    modified: string[]
  }
  compare: string
}

interface WebhookSubscription {
  repoUrl: string
  webhookUrl: string
  secret?: string
  discordWebhookUrl?: string
  componentMappings?: Record<string, string[]> // component -> file patterns
}

class GitHubWebhookService {
  private static instance: GitHubWebhookService
  private subscriptions: Map<string, WebhookSubscription> = new Map()
  private simulationInterval: number | null = null

  private constructor() {
    this.loadSubscriptions()
    this.setupMessageListener()
  }

  static getInstance(): GitHubWebhookService {
    if (!GitHubWebhookService.instance) {
      GitHubWebhookService.instance = new GitHubWebhookService()
    }
    return GitHubWebhookService.instance
  }

  private loadSubscriptions(): void {
    try {
      const saved = localStorage.getItem('github_webhook_subscriptions')
      if (saved) {
        const subscriptions = JSON.parse(saved)
        Object.entries(subscriptions).forEach(([key, value]) => {
          this.subscriptions.set(key, value as WebhookSubscription)
        })
      }
    } catch (error) {
      console.error('Failed to load webhook subscriptions:', error)
    }
  }

  private saveSubscriptions(): void {
    try {
      const subscriptionsObj = Object.fromEntries(this.subscriptions.entries())
      localStorage.setItem('github_webhook_subscriptions', JSON.stringify(subscriptionsObj))
    } catch (error) {
      console.error('Failed to save webhook subscriptions:', error)
    }
  }

  private setupMessageListener(): void {
    // Listen for messages from GitHub webhook events (if using a service worker or iframe)
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'github-webhook') {
        this.handleWebhookPayload(event.data.payload)
      }
    })
  }

  // Subscribe to GitHub push events for a repository
  subscribeToRepository(
    repoUrl: string, 
    options: {
      discordWebhookUrl?: string
      componentMappings?: Record<string, string[]>
      webhookSecret?: string
    } = {}
  ): void {
    const subscription: WebhookSubscription = {
      repoUrl,
      webhookUrl: `${window.location.origin}/api/github-webhook/${btoa(repoUrl)}`,
      secret: options.webhookSecret,
      discordWebhookUrl: options.discordWebhookUrl,
      componentMappings: options.componentMappings
    }

    this.subscriptions.set(repoUrl, subscription)
    this.saveSubscriptions()

    console.log(`Subscribed to GitHub webhooks for ${repoUrl}`)
    
    // Provide webhook URL for GitHub configuration
    this.showWebhookInstructions(repoUrl, subscription.webhookUrl)
  }

  private showWebhookInstructions(repoUrl: string, webhookUrl: string): void {
    console.log(`
    GitHub Webhook Setup Instructions for ${repoUrl}:
    
    1. Go to your GitHub repository: ${repoUrl}
    2. Navigate to Settings > Webhooks
    3. Click "Add webhook"
    4. Set Payload URL to: ${webhookUrl}
    5. Set Content type to: application/json
    6. Select events: Just the push event
    7. Ensure webhook is active
    
    Once configured, Discord notifications will be sent when code is pushed!
    `)
  }

  // Handle incoming webhook payload from GitHub
  async handleWebhookPayload(payload: GitHubWebhookPayload): Promise<void> {
    const repoUrl = payload.repository.html_url
    const subscription = this.subscriptions.get(repoUrl)

    if (!subscription) {
      console.log(`No subscription found for repository: ${repoUrl}`)
      return
    }

    console.log(`Processing GitHub webhook for ${repoUrl}:`, payload)

    try {
      // Extract branch name from ref
      const branch = payload.ref.replace('refs/heads/', '')
      
      // Convert GitHub webhook commits to our format (partial data for component analysis)
      const commits = payload.commits.map(commit => ({
        sha: commit.id,
        commit: {
          message: commit.message,
          author: {
            name: commit.author.name,
            email: commit.author.email,
            date: commit.timestamp
          }
        },
        files: [
          ...commit.added.map(file => ({ filename: file, status: 'added' as const })),
          ...commit.modified.map(file => ({ filename: file, status: 'modified' as const })),
          ...commit.removed.map(file => ({ filename: file, status: 'removed' as const }))
        ]
      }))

      // If component mappings are configured, analyze for component changes
      if (subscription.componentMappings) {
        const componentChanges = this.analyzeComponentChanges(commits, subscription.componentMappings)
        
        if (componentChanges.length > 0) {
          // Send Discord notifications for component changes
          for (const change of componentChanges) {
            await discordNotificationService.notifyComponentChange({
              ...change,
              changelogUrl: `${window.location.origin}/changelog/${encodeURIComponent(repoUrl)}?branch=${branch}`
            })
          }
        }
      }

      // Send general push notification
      await this.sendPushNotification(payload, branch)

      // Trigger content refresh
      this.triggerContentRefresh(repoUrl, commits)

    } catch (error) {
      console.error('Failed to process GitHub webhook:', error)
    }
  }

  private analyzeComponentChanges(
    commits: SimpleCommit[], 
    componentMappings: Record<string, string[]>
  ) {
    const componentChanges: Array<{
      component: string
      type: 'added' | 'modified' | 'removed'
      files: string[]
      commitSha: string
      commitMessage: string
      author: string
      timestamp: string
    }> = []

    for (const commit of commits) {
      const changedComponents = new Set<string>()

      // Check which components are affected
      for (const [component, patterns] of Object.entries(componentMappings)) {
        const affectedFiles = commit.files?.filter((file: { filename: string; status: string }) =>
          patterns.some(pattern => this.matchPattern(file.filename, pattern))
        ) || []

        if (affectedFiles.length > 0) {
          changedComponents.add(component)
          
          const changeType = this.determineChangeType(affectedFiles)
          componentChanges.push({
            component,
            type: changeType,
            files: affectedFiles.map((f: { filename: string }) => f.filename),
            commitSha: commit.sha,
            commitMessage: commit.commit.message.split('\n')[0],
            author: commit.commit.author.name,
            timestamp: commit.commit.author.date
          })
        }
      }
    }

    return componentChanges
  }

  private matchPattern(filename: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    
    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(filename)
  }

  private determineChangeType(files: Array<{filename: string, status: string}>): 'added' | 'modified' | 'removed' {
    const hasAdded = files.some(f => f.status === 'added')
    const hasRemoved = files.some(f => f.status === 'removed')
    
    if (hasAdded) return 'added'
    if (hasRemoved) return 'removed'
    return 'modified'
  }

  private async sendPushNotification(payload: GitHubWebhookPayload, branch: string): Promise<void> {
    const repoName = payload.repository.full_name
    const commitsCount = payload.commits.length
    const pusher = payload.pusher.name

    const embed = {
      title: `🚀 New push to ${repoName}`,
      description: `**${pusher}** pushed ${commitsCount} commit${commitsCount !== 1 ? 's' : ''} to \`${branch}\``,
      color: 0x28a745, // Green color for successful push
      fields: payload.commits.slice(0, 3).map(commit => ({
        name: `\`${commit.id.substring(0, 7)}\``,
        value: commit.message.split('\n')[0].substring(0, 100) + (commit.message.length > 100 ? '...' : ''),
        inline: false
      })),
      timestamp: new Date().toISOString(),
      footer: {
        text: 'AutoDocX • GitHub Integration',
        icon_url: 'https://github.com/favicon.ico'
      },
      url: payload.compare
    }

    if (payload.commits.length > 3) {
      embed.fields.push({
        name: 'And more...',
        value: `+${payload.commits.length - 3} more commit${payload.commits.length - 3 !== 1 ? 's' : ''}`,
        inline: false
      })
    }

    // Send to Discord using the general notification method
    await discordNotificationService.sendWebhookMessage({
      embeds: [embed],
      username: 'AutoDocX GitHub Bot',
      avatar_url: 'https://github.com/favicon.ico'
    })
  }

  private triggerContentRefresh(repoUrl: string, commits: SimpleCommit[]): void {
    // Dispatch custom event for content refresh
    const refreshEvent = new CustomEvent('github-push-refresh', {
      detail: { repoUrl, commits }
    })
    window.dispatchEvent(refreshEvent)
  }

  // Simulate GitHub webhooks for testing (when actual webhooks aren't available)
  startWebhookSimulation(repoUrl: string, intervalMinutes: number = 5): void {
    this.stopWebhookSimulation()

    console.log(`Starting GitHub webhook simulation for ${repoUrl} (${intervalMinutes}min intervals)`)

    this.simulationInterval = window.setInterval(async () => {
      try {
        // Simulate a webhook payload
        const mockPayload: GitHubWebhookPayload = {
          ref: 'refs/heads/main',
          before: 'abc123def456',
          after: 'def456ghi789',
          repository: {
            id: 123456789,
            name: repoUrl.split('/').pop() || 'repository',
            full_name: repoUrl.replace('https://github.com/', ''),
            html_url: repoUrl,
            clone_url: `${repoUrl}.git`
          },
          pusher: {
            name: 'Developer',
            email: 'dev@example.com'
          },
          commits: [{
            id: 'def456ghi789',
            tree_id: 'tree123',
            distinct: true,
            message: `Auto-update simulation ${new Date().toLocaleTimeString()}`,
            timestamp: new Date().toISOString(),
            url: `${repoUrl}/commit/def456ghi789`,
            author: {
              name: 'Developer',
              email: 'dev@example.com',
              username: 'developer'
            },
            committer: {
              name: 'Developer', 
              email: 'dev@example.com',
              username: 'developer'
            },
            added: [],
            removed: [],
            modified: ['README.md', 'src/components/ui/test.tsx']
          }],
          head_commit: {
            id: 'def456ghi789',
            tree_id: 'tree123',
            distinct: true,
            message: `Auto-update simulation ${new Date().toLocaleTimeString()}`,
            timestamp: new Date().toISOString(),
            url: `${repoUrl}/commit/def456ghi789`,
            author: {
              name: 'Developer',
              email: 'dev@example.com',
              username: 'developer'
            },
            committer: {
              name: 'Developer',
              email: 'dev@example.com', 
              username: 'developer'
            },
            added: [],
            removed: [],
            modified: ['README.md', 'src/components/ui/test.tsx']
          },
          compare: `${repoUrl}/compare/abc123def456...def456ghi789`
        }

        await this.handleWebhookPayload(mockPayload)
      } catch (error) {
        console.error('Error in webhook simulation:', error)
      }
    }, intervalMinutes * 60 * 1000)
  }

  stopWebhookSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval)
      this.simulationInterval = null
      console.log('Stopped GitHub webhook simulation')
    }
  }

  // Get webhook URL for a repository (for GitHub configuration)
  getWebhookUrl(repoUrl: string): string | null {
    const subscription = this.subscriptions.get(repoUrl)
    return subscription?.webhookUrl || null
  }

  // List all subscribed repositories
  getSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values())
  }

  // Unsubscribe from a repository
  unsubscribe(repoUrl: string): void {
    this.subscriptions.delete(repoUrl)
    this.saveSubscriptions()
    console.log(`Unsubscribed from GitHub webhooks for ${repoUrl}`)
  }
}

export const gitHubWebhookService = GitHubWebhookService.getInstance()
