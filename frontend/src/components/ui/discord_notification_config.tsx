import React, { useState, useEffect } from 'react'
import { discordNotificationService } from '../../services/discord-notifications'
import { componentChangeMonitor, type DependencyMap } from '../../services/component-monitor'
import './discord_notification_config.css'

type FrameworkType = 'react' | 'vue' | 'angular' | 'svelte' | 'custom'

interface DiscordNotificationConfigProps {
  isOpen: boolean
  onClose: () => void
  repoUrl: string
  repoName: string
  changelogUrl: string
}

const DiscordNotificationConfig: React.FC<DiscordNotificationConfigProps> = ({
  isOpen,
  onClose,
  repoUrl,
  repoName,
  changelogUrl
}) => {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [checkInterval, setCheckInterval] = useState(30) // minutes
  const [framework, setFramework] = useState<FrameworkType>('react')
  const [customDependencies, setCustomDependencies] = useState('')
  const [subscribers, setSubscribers] = useState('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'failure' | null>(null)
  const [isMonitoringActive, setIsMonitoringActive] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Load existing configuration
      const existingWebhook = discordNotificationService.getWebhookUrl()
      if (existingWebhook) {
        setWebhookUrl(existingWebhook)
      }

      const isCurrentlyMonitoring = componentChangeMonitor.isMonitoring(repoUrl)
      setIsMonitoringActive(isCurrentlyMonitoring)

      if (isCurrentlyMonitoring) {
        const configs = componentChangeMonitor.getMonitoringConfigs()
        const currentConfig = configs.get(repoUrl)
        if (currentConfig) {
          setBranch(currentConfig.branch)
          setCheckInterval(currentConfig.checkInterval)
          setSubscribers(currentConfig.subscribers.join(', '))
        }
      }
    }
  }, [isOpen, repoUrl])

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      setTestResult('failure')
      return
    }

    setIsTestingConnection(true)
    setTestResult(null)

    discordNotificationService.setWebhookUrl(webhookUrl)
    const success = await discordNotificationService.testConnection()
    
    setTestResult(success ? 'success' : 'failure')
    setIsTestingConnection(false)
  }

  const handleSaveConfig = () => {
    if (!webhookUrl.trim()) {
      alert('Please enter a Discord webhook URL')
      return
    }

    discordNotificationService.setWebhookUrl(webhookUrl)

    let dependencyMap: DependencyMap

    if (framework === 'custom') {
      // Parse custom dependencies
      const lines = customDependencies.split('\n').filter(line => line.trim())
      dependencyMap = {}
      
      lines.forEach(line => {
        const [component, ...patterns] = line.split(':')
        if (component && patterns.length > 0) {
          dependencyMap[component.trim()] = patterns.join(':').split(',').map(p => p.trim())
        }
      })
      
      if (Object.keys(dependencyMap).length === 0) {
        alert('Invalid custom dependency format. Use: ComponentName: pattern1, pattern2')
        return
      }
    } else {
      // Use default framework patterns
      const frameworkPatterns: Record<string, DependencyMap> = {
        react: {
          'React Components': ['src/components/**/*.tsx', 'src/components/**/*.jsx'],
          'React Pages': ['src/pages/**/*.tsx', 'src/pages/**/*.jsx'],
          'React Hooks': ['src/hooks/**/*.ts', 'src/hooks/**/*.tsx']
        },
        vue: {
          'Vue Components': ['src/components/**/*.vue'],
          'Vue Pages': ['src/pages/**/*.vue', 'src/views/**/*.vue'],
          'Vue Composables': ['src/composables/**/*.ts']
        },
        angular: {
          'Angular Components': ['src/app/**/*.component.ts'],
          'Angular Services': ['src/app/**/*.service.ts'],
          'Angular Modules': ['src/app/**/*.module.ts']
        },
        svelte: {
          'Svelte Components': ['src/lib/**/*.svelte', 'src/components/**/*.svelte'],
          'Svelte Pages': ['src/routes/**/*.svelte'],
          'Svelte Stores': ['src/lib/stores/**/*.ts']
        }
      }
      dependencyMap = frameworkPatterns[framework] || frameworkPatterns.react
    }

    const subscriberList = subscribers
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    componentChangeMonitor.addMonitoring(repoUrl, {
      branch,
      changelogUrl,
      checkInterval,
      dependencyMap,
      subscribers: subscriberList
    })

    setIsMonitoringActive(true)
    onClose()
  }

  const handleStopMonitoring = () => {
    componentChangeMonitor.removeMonitoring(repoUrl)
    setIsMonitoringActive(false)
  }

  const handleForceCheck = async () => {
    if (!isMonitoringActive) return
    await componentChangeMonitor.forceCheck(repoUrl)
    alert('Manual check completed! Check Discord for any notifications.')
  }

  const getFrameworkDependencyPreview = (fw: string) => {
    if (fw === 'custom') return ''
    
    const frameworkPatterns: Record<string, DependencyMap> = {
      react: {
        'React Components': ['src/components/**/*.tsx', 'src/components/**/*.jsx'],
        'React Pages': ['src/pages/**/*.tsx', 'src/pages/**/*.jsx'],
        'React Hooks': ['src/hooks/**/*.ts', 'src/hooks/**/*.tsx']
      },
      vue: {
        'Vue Components': ['src/components/**/*.vue'],
        'Vue Pages': ['src/pages/**/*.vue', 'src/views/**/*.vue'],
        'Vue Composables': ['src/composables/**/*.ts']
      },
      angular: {
        'Angular Components': ['src/app/**/*.component.ts'],
        'Angular Services': ['src/app/**/*.service.ts'],
        'Angular Modules': ['src/app/**/*.module.ts']
      },
      svelte: {
        'Svelte Components': ['src/lib/**/*.svelte', 'src/components/**/*.svelte'],
        'Svelte Pages': ['src/routes/**/*.svelte'],
        'Svelte Stores': ['src/lib/stores/**/*.ts']
      }
    }
    
    const depMap = frameworkPatterns[fw] || frameworkPatterns.react
    return Object.entries(depMap)
      .map(([component, patterns]) => `${component}: ${patterns.slice(0, 2).join(', ')}${patterns.length > 2 ? '...' : ''}`)
      .slice(0, 3)
      .join('\n') + (Object.keys(depMap).length > 3 ? '\n...' : '')
  }

  if (!isOpen) return null

  return (
    <div className="discord-config-overlay">
      <div className="discord-config-dialog">
        <div className="discord-config-header">
          <h2>Discord Notifications</h2>
          <p>Get notified when components in <strong>{repoName}</strong> change</p>
          <button className="discord-config-close" onClick={onClose}>×</button>
        </div>

        <div className="discord-config-content">
          <div className="discord-config-section">
            <label className="discord-config-label">
              Discord Webhook URL
              <span className="discord-config-required">*</span>
            </label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="discord-config-input"
            />
            <div className="discord-config-actions">
              <button
                onClick={handleTestConnection}
                disabled={isTestingConnection || !webhookUrl.trim()}
                className="discord-config-button secondary"
              >
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </button>
              {testResult === 'success' && (
                <span className="discord-config-status success">✅ Connection successful!</span>
              )}
              {testResult === 'failure' && (
                <span className="discord-config-status failure">❌ Connection failed</span>
              )}
            </div>
            <p className="discord-config-help">
              <a 
                href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Learn how to create a Discord webhook
              </a>
            </p>
          </div>

          <div className="discord-config-section">
            <label className="discord-config-label">Branch to Monitor</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="discord-config-input"
            />
          </div>

          <div className="discord-config-section">
            <label className="discord-config-label">Check Interval (minutes)</label>
            <input
              type="number"
              value={checkInterval}
              onChange={(e) => setCheckInterval(parseInt(e.target.value) || 30)}
              min="5"
              max="1440"
              className="discord-config-input"
            />
            <p className="discord-config-help">How often to check for changes (5-1440 minutes)</p>
          </div>

          <div className="discord-config-section">
            <label className="discord-config-label">Framework/Project Type</label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value as FrameworkType)}
              className="discord-config-select"
            >
              <option value="react">React</option>
              <option value="vue">Vue.js</option>
              <option value="angular">Angular</option>
              <option value="svelte">Svelte</option>
              <option value="custom">Custom</option>
            </select>
            
            {framework !== 'custom' && (
              <div className="discord-config-preview">
                <strong>Components to monitor:</strong>
                <pre>{getFrameworkDependencyPreview(framework)}</pre>
              </div>
            )}

            {framework === 'custom' && (
              <div>
                <label className="discord-config-label">Custom Dependencies</label>
                <textarea
                  value={customDependencies}
                  onChange={(e) => setCustomDependencies(e.target.value)}
                  placeholder={`Example format:
React Components: src/components/**/*.tsx, src/components/**/*.jsx
Services: src/services/**/*.ts
Utils: src/utils/**/*.ts`}
                  className="discord-config-textarea"
                  rows={6}
                />
                <p className="discord-config-help">
                  Format: ComponentName: pattern1, pattern2
                </p>
              </div>
            )}
          </div>

          <div className="discord-config-section">
            <label className="discord-config-label">Discord Users to Mention (optional)</label>
            <input
              type="text"
              value={subscribers}
              onChange={(e) => setSubscribers(e.target.value)}
              placeholder="@username1, @username2"
              className="discord-config-input"
            />
            <p className="discord-config-help">Comma-separated Discord usernames</p>
          </div>

          {isMonitoringActive && (
            <div className="discord-config-status-section">
              <div className="discord-config-status active">
                ✅ Monitoring is active for this repository
              </div>
              <div className="discord-config-actions">
                <button
                  onClick={handleForceCheck}
                  className="discord-config-button secondary"
                >
                  🔍 Check Now
                </button>
                <button
                  onClick={handleStopMonitoring}
                  className="discord-config-button danger"
                >
                  🛑 Stop Monitoring
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="discord-config-footer">
          <button onClick={onClose} className="discord-config-button secondary">
            Cancel
          </button>
          <button
            onClick={handleSaveConfig}
            className="discord-config-button primary"
            disabled={!webhookUrl.trim()}
          >
            {isMonitoringActive ? 'Update Configuration' : 'Start Monitoring'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DiscordNotificationConfig
