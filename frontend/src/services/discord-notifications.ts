// Discord Notification Service
interface DiscordWebhookPayload {
  content?: string
  username?: string
  avatar_url?: string
  embeds?: DiscordEmbed[]
}

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  url?: string
  timestamp?: string
  footer?: {
    text: string
    icon_url?: string
  }
  author?: {
    name: string
    url?: string
    icon_url?: string
  }
  fields?: {
    name: string
    value: string
    inline?: boolean
  }[]
}

interface ComponentChange {
  component: string
  type: 'added' | 'modified' | 'removed'
  files: string[]
  commitSha: string
  commitMessage: string
  author: string
  timestamp: string
  changelogUrl: string
}

class DiscordNotificationService {
  private static instance: DiscordNotificationService
  private webhookUrl: string | null = null

  private constructor() {
    // Initialize webhook URL from environment or localStorage
    this.webhookUrl = localStorage.getItem('discord_webhook_url') || 
                     import.meta.env.VITE_DISCORD_WEBHOOK_URL || 
                     null
  }

  static getInstance(): DiscordNotificationService {
    if (!DiscordNotificationService.instance) {
      DiscordNotificationService.instance = new DiscordNotificationService()
    }
    return DiscordNotificationService.instance
  }

  setWebhookUrl(url: string): void {
    this.webhookUrl = url
    localStorage.setItem('discord_webhook_url', url)
  }

  getWebhookUrl(): string | null {
    return this.webhookUrl
  }

  isConfigured(): boolean {
    return this.webhookUrl !== null && this.webhookUrl.trim() !== ''
  }

  async sendNotification(payload: DiscordWebhookPayload): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Discord webhook not configured')
      return false
    }

    try {
      const response = await fetch(this.webhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('Failed to send Discord notification:', error)
      return false
    }
  }

  async notifyComponentChange(change: ComponentChange): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: `🔧 Component ${change.type.charAt(0).toUpperCase() + change.type.slice(1)}: ${change.component}`,
      description: change.commitMessage,
      color: this.getColorForChangeType(change.type),
      url: change.changelogUrl,
      timestamp: new Date(change.timestamp).toISOString(),
      author: {
        name: change.author,
        icon_url: `https://github.com/${change.author}.png`
      },
      fields: [
        {
          name: '📁 Files Changed',
          value: change.files.length > 10 
            ? `${change.files.slice(0, 10).map(f => `\`${f}\``).join('\n')}\n*...and ${change.files.length - 10} more*`
            : change.files.map(f => `\`${f}\``).join('\n') || 'No files listed',
          inline: false
        },
        {
          name: '🔗 Commit',
          value: `[\`${change.commitSha.slice(0, 7)}\`](https://github.com/owner/repo/commit/${change.commitSha})`,
          inline: true
        },
        {
          name: '📋 View Changes',
          value: `[Open Changelog](${change.changelogUrl})`,
          inline: true
        }
      ],
      footer: {
        text: 'AutoDocX Component Monitor',
        icon_url: 'https://github.com/kimhongzhang323/Codenection2025/blob/master/static/logo.png?raw=true'
      }
    }

    const payload: DiscordWebhookPayload = {
      username: 'AutoDocX Monitor',
      avatar_url: 'https://github.com/kimhongzhang323/Codenection2025/blob/master/static/logo.png?raw=true',
      embeds: [embed]
    }

    return await this.sendNotification(payload)
  }

  async notifyMultipleChanges(changes: ComponentChange[], repoName: string): Promise<boolean> {
    const groupedChanges = changes.reduce((acc, change) => {
      if (!acc[change.type]) acc[change.type] = []
      acc[change.type].push(change)
      return acc
    }, {} as Record<string, ComponentChange[]>)

    const fields: {name: string, value: string, inline?: boolean}[] = []
    
    Object.entries(groupedChanges).forEach(([type, typeChanges]) => {
      const componentsList = typeChanges
        .map(c => `• **${c.component}** by ${c.author}`)
        .slice(0, 10)
        .join('\n')
      
      fields.push({
        name: `${this.getEmojiForChangeType(type)} ${type.charAt(0).toUpperCase() + type.slice(1)} (${typeChanges.length})`,
        value: componentsList + (typeChanges.length > 10 ? `\n*...and ${typeChanges.length - 10} more*` : ''),
        inline: false
      })
    })

    const embed: DiscordEmbed = {
      title: `📦 Multiple Component Changes in ${repoName}`,
      description: `${changes.length} component${changes.length > 1 ? 's' : ''} ${changes.length > 1 ? 'have' : 'has'} been updated`,
      color: 0x5865F2, // Discord blurple
      timestamp: new Date().toISOString(),
      fields,
      footer: {
        text: 'AutoDocX Component Monitor',
        icon_url: 'https://github.com/kimhongzhang323/Codenection2025/blob/master/static/logo.png?raw=true'
      }
    }

    const payload: DiscordWebhookPayload = {
      username: 'AutoDocX Monitor',
      avatar_url: 'https://github.com/kimhongzhang323/Codenection2025/blob/master/static/logo.png?raw=true',
      embeds: [embed]
    }

    return await this.sendNotification(payload)
  }

  private getColorForChangeType(type: string): number {
    switch (type) {
      case 'added': return 0x57F287 // Green
      case 'modified': return 0xFEE75C // Yellow
      case 'removed': return 0xED4245 // Red
      default: return 0x5865F2 // Discord blurple
    }
  }

  private getEmojiForChangeType(type: string): string {
    switch (type) {
      case 'added': return '✅'
      case 'modified': return '🔄'
      case 'removed': return '❌'
      default: return '🔧'
    }
  }

  async testConnection(): Promise<boolean> {
    const testPayload: DiscordWebhookPayload = {
      username: 'AutoDocX Monitor',
      avatar_url: 'https://github.com/kimhongzhang323/Codenection2025/blob/master/static/logo.png?raw=true',
      embeds: [{
        title: '✅ Discord Integration Test',
        description: 'This is a test message to verify Discord webhook configuration.',
        color: 0x57F287,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'AutoDocX Component Monitor'
        }
      }]
    }

    return await this.sendNotification(testPayload)
  }

  // Send a raw webhook message (used by GitHub webhook service)
  async sendWebhookMessage(payload: DiscordWebhookPayload): Promise<boolean> {
    return await this.sendNotification(payload)
  }
}

export const discordNotificationService = DiscordNotificationService.getInstance()
export type { ComponentChange, DiscordEmbed, DiscordWebhookPayload }
