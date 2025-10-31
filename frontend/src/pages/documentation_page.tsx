import { useCallback, useEffect, useRef, useState } from 'react'
import './documentation_page.css'
import { GithubIcon } from '../components/icons/github_icon'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatedThemeToggler } from '../components/theme'
import { BottomMiniDialog } from '../components/ui/bottom_mini_dialog'
import { useAIChat } from '../contexts/AIChatContext'
import ToolsDropdown from '../components/ui/tools_dropdown'
import SearchDialog from '../components/ui/search_dialog'
import SuggestionPanel from '../components/ui/suggestion_panel'
import ContextMenu from '../components/ui/context_menu'
import FolderContextMenu from '../components/ui/folder_context_menu'
import { GlobeIcon } from '../components/icons/globe_icon'
import { CodeIcon } from '../components/icons/code_icon'
import { HistoryIcon } from '../components/icons/history_icon'
import { DiagramIcon } from '../components/icons/diagram_icon'
import ShareDialog from '../components/ui/share_dialog'
import ViewCodeDialog from '../components/ui/view_code_dialog'
import DocumentationSection from '../components/documentation_section'
import ExportDialog from '../components/ui/export_dialog'
import EmbeddedChangelog from '../components/embedded_changelog'
import EmbeddedFlowchart from '../components/embedded_flowchart'
import { ExportIcon } from '../components/icons/export_icon'
import DiscordNotificationConfig from '../components/ui/discord_notification_config'
import { useAutoUpdate } from '../hooks/useAutoUpdate'
import AutoUpdateNotification from '../components/ui/auto_update_notification'
import type { GitHubCommit } from '../services/api'
import { gitHubWebhookService } from '../services/github-webhook-service'

function DocumentationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { repo, subpage } = useParams<{ repo: string; subpage?: string }>()
  const locationState = location.state as { repoUrl?: string; repoData?: { name?: string; fullName?: string } } | undefined
  const repoUrl = locationState?.repoUrl
  const fallbackUrl = locationState?.repoData?.name
    ? `https://github.com/${locationState.repoData.name.replace(/\s*\/\s*/, '/')}`
    : undefined
  
  // Construct GitHub URL from repo parameter if available
  const repoBasedUrl = repo ? `https://github.com/${decodeURIComponent(repo)}` : undefined
  const githubHref = repoUrl || fallbackUrl || repoBasedUrl || '#'
  
  // Debug GitHub URL construction
  console.log('[DocumentationPage] GitHub URL construction:', {
    repoUrl,
    fallbackUrl,
    repoBasedUrl,
    repo,
    githubHref,
    locationState: locationState?.repoData
  })

  const [isDarkSelected, setIsDarkSelected] = useState(() => {
    // Check localStorage first, then document class, default to dark
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) {
        return saved === 'dark'
      }
      return document.documentElement.classList.contains('dark')
    }
    return true // Default to dark mode
  })
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'reading' | 'edit'>('reading')
  const [documentationContent, setDocumentationContent] = useState<string>('')
  
  // Content handlers for synchronization
  const handleContentLoaded = useCallback((content: string) => {
    setDocumentationContent(content)
  }, [])

  const handleContentChange = useCallback((content: string) => {
    setDocumentationContent(content)
  }, [])

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    
    // Mobile device detection
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                          window.innerWidth <= 768 ||
                          ('ontouchstart' in window)
    
    const isVerySmall = window.innerWidth <= 1024
    const saved = localStorage.getItem('sidebarCollapsed')
    
    // On mobile devices, always start collapsed
    if (isMobileDevice) {
      return true
    }
    
    // On very small screens, default to collapsed unless explicitly saved as open
    if (isVerySmall) {
      return saved ? JSON.parse(saved) : true
    }
    
    // On larger screens, use saved preference or default to open
    return saved ? JSON.parse(saved) : false
  })
  const { toggleChat, setRepositoryInfo } = useAIChat()

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSuggestionPanelOpen, setIsSuggestionPanelOpen] = useState(false)
  const [showTOC, setShowTOC] = useState(true)

  const [contextMenu, setContextMenu] = useState<{ isVisible: boolean; x: number; y: number }>({
    isVisible: false,
    x: 0,
    y: 0
  })
  const [folderContextMenu, setFolderContextMenu] = useState<{ isVisible: boolean; x: number; y: number; itemType: 'file' | 'folder' | null }>({
    isVisible: false,
    x: 0,
    y: 0,
    itemType: null
  })
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isViewCodeDialogOpen, setIsViewCodeDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isDiscordConfigOpen, setIsDiscordConfigOpen] = useState(false)
  const [isDiscordMonitoringActive, setIsDiscordMonitoringActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Auto-update functionality
  const [refreshKey, setRefreshKey] = useState(0)
  
  const {
    isMonitoring,
    lastUpdate,
    newCommitsCount,
    latestCommits,
    startMonitoring,
    stopMonitoring,
    forceCheck,
    clearNotifications
  } = useAutoUpdate({
    repoUrl: githubHref !== '#' ? githubHref : undefined,
    branch: 'main', // You can make this dynamic based on branch selector
    checkInterval: 2, // Check every 2 minutes
    autoStart: true,
    onNewCommits: (commits: GitHubCommit[]) => {
      console.log('New commits detected:', commits)
      // You can add additional logic here like showing toast notifications
    },
    onContentUpdate: () => {
      console.log('Content update triggered')
      // This will trigger re-rendering of documentation content
      setRefreshKey(prev => prev + 1)
    },
    onError: (error: Error) => {
      console.error('Auto-update error:', error)
    }
  })


  // GitHub webhook integration
  const [isGitHubBotEnabled, setIsGitHubBotEnabled] = useState(false)
  


  useEffect(() => {
    // Set up GitHub webhook integration when repo URL is available
    if (githubHref !== '#') {
      // Subscribe to GitHub webhook events for Discord notifications
      gitHubWebhookService.subscribeToRepository(githubHref, {
        componentMappings: {
          'Frontend Components': ['src/components/**/*.tsx', 'src/components/**/*.ts'],
          'Documentation': ['README.md', 'docs/**/*.md', '*.md'],
          'Styles': ['src/**/*.css', 'src/**/*.scss'],
          'API Services': ['src/services/**/*.ts', 'src/api/**/*.ts'],
          'Configuration': ['package.json', 'tsconfig.json', 'vite.config.ts', '*.config.*']
        }
      })
      
      // Enable GitHub bot simulation for demo purposes
      setIsGitHubBotEnabled(true)
      
      // Start webhook simulation (for demo - in production this would be real webhooks)
      gitHubWebhookService.startWebhookSimulation(githubHref, 3) // Every 3 minutes
      
      // Listen for GitHub push events to refresh content
      const handleGitHubPush = (event: CustomEvent) => {
        if (event.detail.repoUrl === githubHref) {
          console.log('GitHub push detected, refreshing content...')
          setRefreshKey(prev => prev + 1)
        }
      }
      
      window.addEventListener('github-push-refresh', handleGitHubPush as EventListener)
      
      return () => {
        window.removeEventListener('github-push-refresh', handleGitHubPush as EventListener)
        gitHubWebhookService.stopWebhookSimulation()
      }
    }
  }, [githubHref])

  // Set repository info for AI chat
  useEffect(() => {
    if (githubHref && githubHref !== '#') {
      setRepositoryInfo(githubHref, 'main')
    }
  }, [githubHref, setRepositoryInfo])

  // Determine encoded repo slug for routing back to repo root
  const repoSlug = (() => {
    if (repo) return repo
    const fullName = locationState?.repoData?.fullName
    if (fullName) return encodeURIComponent(fullName.toLowerCase())
    if (repoUrl) {
      try {
        const url = new URL(repoUrl)
        const path = url.pathname.replace(/^\//, '')
        return encodeURIComponent(path.toLowerCase())
      } catch {
        console.log('Invalid repo URL')
      }
    }
    return ''
  })()

  // Derive sidebar title: prefer repo name only (without owner) from state or repoUrl
  let sidebarTitle = 'Docs'
  if (locationState?.repoData?.fullName) {
    // Extract just the repo name (part after the slash)
    sidebarTitle = locationState.repoData.fullName.split('/')[1] || locationState.repoData.fullName
  } else if (repoUrl) {
    try {
      const url = new URL(repoUrl)
      const fullPath = url.pathname.replace(/^\//, '') || 'Docs'
      // Extract just the repo name if it's in owner/repo format
      sidebarTitle = fullPath.split('/')[1] || fullPath
    } catch {
      // ignore parse errors and keep default
    }
  }

  // On first load or URL changes, ensure we are at /:repo/:file and sync active label
  useEffect(() => {
    const pathname = location.pathname.replace(/\/+$/, '')
    const parts = pathname.split('/').filter(Boolean)
    // parts example: [repo, file]
    const repoPart = parts[0] || repoSlug
    const filePart = parts[1]

    console.log('DocumentationPage - Route change detected:', { 
      pathname: location.pathname,
      filePart, 
      repoPart,
      currentActiveLabel: activeLabel
    })

    // Handle root repo path - show welcome screen
    if (repoPart && !filePart) {
      console.log('Setting activeLabel to Welcome (root path)')
      setActiveLabel('Welcome')
      setRefreshKey(prev => prev + 1) // Force refresh
      return
    }

    // Sync active label from slug in URL
    if (filePart) {
      const targetSlug = filePart.toLowerCase()
      
      console.log('DocumentationPage - URL parsing:', { 
        filePart, 
        targetSlug, 
        subpage, 
        currentPath: location.pathname 
      })
      
      // Handle special routes directly (changelog, flowchart, documentation)
      if (targetSlug === 'changelog') {
        console.log('Setting activeLabel to Changelog')
        setActiveLabel('Changelog')
        setRefreshKey(prev => prev + 1) // Force refresh
        return
      } else if (targetSlug === 'flowchart') {
        console.log('Setting activeLabel to System Diagrams')
        setActiveLabel('System Diagrams')
        setRefreshKey(prev => prev + 1) // Force refresh
        return
      } else if (targetSlug === 'documentation') {
        console.log('Setting activeLabel to Main Documentation')
        setActiveLabel('Main Documentation')
        setRefreshKey(prev => prev + 1) // Force refresh
        return
      } else if (targetSlug === 'docs') {
        // Handle docs sub-routes
        const pathParts = location.pathname.split('/')
        const docsIndex = pathParts.indexOf('docs')
        const subSection = pathParts[docsIndex + 1]
        
        if (subSection === 'overview') {
          console.log('Setting activeLabel to Overview')
          setActiveLabel('Overview')
          setRefreshKey(prev => prev + 1) // Force refresh
        } else if (subSection === 'quickstart') {
          console.log('Setting activeLabel to Quick Start')
          setActiveLabel('Quick Start')
          setRefreshKey(prev => prev + 1) // Force refresh
        } else if (subSection === 'requirements') {
          console.log('Setting activeLabel to Requirements')
          setActiveLabel('Requirements')
          setRefreshKey(prev => prev + 1) // Force refresh
        }
        return
      }
    }
  }, [location.pathname, repoSlug, subpage]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSidebarToggle = useCallback(() => {
    const newState = !isSidebarCollapsed
    setIsSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
  }, [isSidebarCollapsed])

  const handleDiscordMonitoringStateChange = useCallback((isActive: boolean) => {
    setIsDiscordMonitoringActive(isActive)
  }, [])

  // Handle clicking on overlay to close sidebar on smaller screens
  const handleOverlayClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      setIsSidebarCollapsed(true)
      localStorage.setItem('sidebarCollapsed', JSON.stringify(true))
    }
  }


  const handleLogoRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({
      isVisible: true,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handleContextMenuClose = () => {
    setContextMenu({ isVisible: false, x: 0, y: 0 })
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
    handleContextMenuClose()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check if file is an image
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const imageUrl = event.target?.result as string
          // Replace the logo source with the uploaded image
          const logoElement = document.querySelector('.docs-sidebar__logo') as HTMLImageElement
          if (logoElement) {
            logoElement.src = imageUrl
          }
        }
        reader.readAsDataURL(file)
      } else {
        console.log('Please select an image file (JPG, PNG)')
      }
    }
  }

  const handleFolderContextMenuClose = () => {
    setFolderContextMenu({ isVisible: false, x: 0, y: 0, itemType: null })
  }

  const handleNewNote = () => {
    console.log('Create new note')
    handleFolderContextMenuClose()
  }

  const handleNewFolder = () => {
    console.log('Create new folder')
    handleFolderContextMenuClose()
  }

  const handleRename = () => {
    console.log('Rename item')
    handleFolderContextMenuClose()
  }

  const handleDelete = () => {
    console.log('Delete item')
    handleFolderContextMenuClose()
  }

  // Open search dialog on Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k'
      const isCtrlOrMeta = e.ctrlKey || e.metaKey
      if (isCtrlOrMeta && isK) {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Handle theme changes and persist to localStorage
  const handleThemeToggle = (isDark: boolean) => {
    setIsDarkSelected(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  // Handle share functionality
  const handleShare = () => {
    setIsShareDialogOpen(true)
  }

  // Handle view code functionality
  const handleViewCode = () => {
    setIsViewCodeDialogOpen(true)
  }

  // Handle export functionality
  const handleExport = () => {
    setIsExportDialogOpen(true)
  }

  // Sync document class with theme state
  useEffect(() => {
    if (isDarkSelected) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkSelected])

  // Dynamic TOC visibility and sidebar auto-collapse based on available space
  useEffect(() => {
    const isMobileDevice = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
             window.innerWidth <= 768 ||
             ('ontouchstart' in window)
    }

    const handleResize = () => {
      const windowWidth = window.innerWidth
      const isMobile = windowWidth <= 768 || isMobileDevice()
      const isVerySmall = windowWidth <= 1024
      
      // Auto-collapse sidebar on mobile and very small screens
      if ((isMobile || isVerySmall) && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true)
        localStorage.setItem('sidebarCollapsed', JSON.stringify(true))
      }
      
      // Calculate TOC space
      const sidebarWidth = isSidebarCollapsed ? 0 : 260
      const contentWidth = 720
      const tocWidth = 200
      const gaps = 60
      const minSpaceNeeded = sidebarWidth + contentWidth + tocWidth + gaps
      
      // Hide TOC if there's not enough space
      setShowTOC(windowWidth >= minSpaceNeeded && windowWidth > 1500)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isSidebarCollapsed])

  // Keyboard shortcut for toggling sidebar (Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+B (or Cmd+B on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault() // Prevent default browser behavior
        handleSidebarToggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSidebarToggle])

  return (
    <div className="documentation-page">
      {/* Collapsed sidebar button */}
      {isSidebarCollapsed && (
        <div className="docs-collapsed-buttons">
          <button 
            className="docs-collapsed-button"
            onClick={handleSidebarToggle}
            aria-label="Toggle sidebar"
          >
            <img 
              src="/sidebar-collapse.svg" 
              alt="Toggle sidebar" 
              width="20" 
              height="20" 
              style={{ 
                filter: isDarkSelected ? 'brightness(0) invert(1)' : 'brightness(0)'
              }}
            />
          </button>
        </div>
      )}

      {/* Tools Dropdown - Contains all tools */}
      <div className="docs-tools-dropdown-container">
        <ToolsDropdown 
          githubHref={githubHref}
          pageContent={`Current page: ${activeLabel}`}
          onToggleSuggestions={() => setIsSuggestionPanelOpen(prev => !prev)}
          isMonitoring={isMonitoring}
          newCommitsCount={newCommitsCount}
          onToggleAutoUpdate={() => {
            if (isMonitoring) {
              stopMonitoring()
            } else {
              startMonitoring()
            }
          }}
          isGitHubBotEnabled={isGitHubBotEnabled}
          onToggleGitHubBot={() => {
            if (isGitHubBotEnabled) {
              gitHubWebhookService.stopWebhookSimulation()
              setIsGitHubBotEnabled(false)
            } else {
              if (githubHref !== '#') {
                gitHubWebhookService.startWebhookSimulation(githubHref, 3)
                setIsGitHubBotEnabled(true)
              }
            }
          }}
          isDiscordMonitoringActive={isDiscordMonitoringActive}
          onOpenDiscordConfig={() => setIsDiscordConfigOpen(true)}
          onToggleAIChat={toggleChat}
        />
      </div>

      {/* View Code Button - Top Right Corner */}
      <div className="docs-view-code-button-container">
        <button
          className="docs-view-code-button"
          onClick={handleViewCode}
          aria-label="View code"
        >
          <CodeIcon size={16} />
          <span>View Code</span>
        </button>
      </div>

      {/* Share Button - Top Right Corner */}
      <div className="docs-share-button-container">
        <button
          className="docs-share-button"
          onClick={handleShare}
          aria-label="Share this page"
        >
          <GlobeIcon size={16} />
          <span>Share</span>
        </button>
      </div>

      {/* Export Button - Top Right Corner */}
      <div className="docs-export-button-container">
        <button
          className="docs-export-button"
          onClick={handleExport}
          aria-label="Export documentation"
        >
          <ExportIcon size={16} />
          <span>Export</span>
        </button>
      </div>

      <div 
        className={`docs-layout ${isSidebarCollapsed ? 'is-collapsed' : ''}`}
        onClick={handleOverlayClick}
      >
        <aside 
          className={`docs-sidebar ${isSidebarCollapsed ? 'is-collapsed' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="docs-sidebar__header">
            <div className="docs-sidebar__title">
              <div className="docs-sidebar__title-left">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="docs-sidebar__logo" 
                  onContextMenu={handleLogoRightClick}
                />
                <span>{sidebarTitle}</span>
              </div>
              <img 
                src="/sidebar-collapse.svg"
                alt="Toggle sidebar" 
                className="docs-sidebar__collapse-icon" 
                onClick={handleSidebarToggle}
                style={{ 
                  filter: isDarkSelected ? 'brightness(0) invert(1)' : 'brightness(0)'
                }}
              />
            </div>
            <div className="docs-sidebar__search" onClick={() => setIsSearchOpen(true)} role="button" aria-label="Open search">
              <svg className="docs-sidebar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Search" aria-label="Search docs" readOnly />
              <div className="docs-sidebar__search-shortcut">
                <span className="docs-sidebar__search-shortcut-key">Ctrl</span>
                <span className="docs-sidebar__search-shortcut-key">K</span>
              </div>
            </div>
          </div>
          
          {/* Special Pages Navigation */}
          <div className="docs-sidebar__section">
            <div className="docs-sidebar__section-header">
              <h3>Repository Overview</h3>
            </div>
            <div className="docs-sidebar__nav">
              <button 
                className={`docs-sidebar__nav-item ${activeLabel === 'Changelog' ? 'is-active' : ''}`}
                onClick={() => {
                  const repoPath = window.location.pathname.split('/')[1]
                  navigate(`/${repoPath}/changelog`, {
                    state: location.state
                  })
                  setTimeout(() => window.location.reload(), 100)
                }}
                aria-label="View Changelog"
              >
                <HistoryIcon size={16} />
                <span>Changelog</span>
              </button>
              
              <button 
                className={`docs-sidebar__nav-item ${activeLabel === 'System Diagrams' ? 'is-active' : ''}`}
                onClick={() => {
                  const repoPath = window.location.pathname.split('/')[1]
                  navigate(`/${repoPath}/flowchart`, {
                    state: location.state
                  })
                  setTimeout(() => window.location.reload(), 100)
                }}
                aria-label="View System Diagrams"
                style={{ display: 'none' }} // Temporarily hidden
              >
                <DiagramIcon size={16} />
                <span>System Diagrams</span>
              </button>
              
              <button 
                className={`docs-sidebar__nav-item ${activeLabel === 'System Tracing' ? 'is-active' : ''}`}
                onClick={() => {
                  // Check if we're already on the tracing page
                  if (window.location.pathname === '/tracing') {
                    // If already on tracing page, just reload to refresh content
                    setTimeout(() => window.location.reload(), 100)
                  } else {
                    // Navigate to tracing page
                    navigate('/tracing')
                  }
                }}
                aria-label="View System Tracing & Logs"
              >
                <HistoryIcon size={16} />
                <span>System Tracing</span>
              </button>
            </div>
          </div>

          {/* Documentation Tree Section */}
          <div className="docs-sidebar__section">
            <div className="docs-sidebar__section-header">
              <h3>Documentation</h3>
            </div>
            <div className="docs-sidebar__nav">
              <button 
                className={`docs-sidebar__nav-item ${activeLabel === 'Overview' ? 'is-active' : ''}`}
                onClick={() => {
                  const repoPath = window.location.pathname.split('/')[1]
                  navigate(`/${repoPath}/docs/overview`, {
                    state: location.state
                  })
                  setTimeout(() => window.location.reload(), 100)
                }}
                aria-label="View Overview"
              >
                <span>Overview</span>
              </button>
              
              <button 
                className={`docs-sidebar__nav-item ${activeLabel === 'Quick Start' ? 'is-active' : ''}`}
                onClick={() => {
                  const repoPath = window.location.pathname.split('/')[1]
                  navigate(`/${repoPath}/docs/quickstart`, {
                    state: location.state
                  })
                  setTimeout(() => window.location.reload(), 100)
                }}
                aria-label="View Quick Start"
              >
                <span>Quick Start</span>
              </button>
              
              <button 
                className={`docs-sidebar__nav-item ${activeLabel === 'Requirements' ? 'is-active' : ''}`}
                onClick={() => {
                  const repoPath = window.location.pathname.split('/')[1]
                  navigate(`/${repoPath}/docs/requirements`, {
                    state: location.state
                  })
                  setTimeout(() => window.location.reload(), 100)
                }}
                aria-label="View Requirements"
              >
                <span>Requirements</span>
              </button>
              
              <button 
                className={`docs-sidebar__nav-item ${activeLabel === 'Main Documentation' ? 'is-active' : ''}`}
                onClick={() => {
                  const repoPath = window.location.pathname.split('/')[1]
                  navigate(`/${repoPath}/documentation`, {
                    state: location.state
                  })
                  setTimeout(() => window.location.reload(), 100)
                }}
                aria-label="View Full Documentation"
              >
                <span>Full README</span>
              </button>
            </div>
          </div>
          
          <div className="docs-sidebar__footer">
            <a className="docs-footer__gh" href={githubHref} target="_blank" rel="noreferrer" aria-label="GitHub">
              <GithubIcon />
            </a>
            <AnimatedThemeToggler 
              className={`docs-toggle ${isDarkSelected ? 'is-dark' : 'is-light'}`}
              isDarkMode={isDarkSelected}
              onToggle={handleThemeToggle}
            />
          </div>
        </aside>
        <main className={`docs-main ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
          <div className="docs-main__container">
            {activeLabel === 'Changelog' ? (
                  <EmbeddedChangelog 
                    repo={repo} 
                    repoUrl={githubHref}
                    className="changelog-main"
                  />
                ) : activeLabel === 'System Diagrams' ? (
                  <EmbeddedFlowchart 
                    className="flowchart-main"
                  />
                ) : activeLabel === 'Main Documentation' ? (
                  <DocumentationSection 
                    key={`fullreadme-${refreshKey}`}
                    section="fullreadme" 
                    githubHref={githubHref}
                    showTOC={showTOC}
                    viewMode={viewMode}
                    onContentLoaded={handleContentLoaded}
                    onContentChange={handleContentChange}
                  />
                ) : activeLabel === 'Overview' ? (
                  <DocumentationSection 
                    key={`overview-${refreshKey}`}
                    section="overview" 
                    githubHref={githubHref}
                    showTOC={showTOC}
                    viewMode={viewMode}
                    onContentLoaded={handleContentLoaded}
                    onContentChange={handleContentChange}
                  />
                ) : activeLabel === 'Quick Start' ? (
                  <DocumentationSection 
                    key={`quickstart-${refreshKey}`}
                    section="quickstart" 
                    githubHref={githubHref}
                    showTOC={showTOC}
                    viewMode={viewMode}
                    onContentLoaded={handleContentLoaded}
                    onContentChange={handleContentChange}
                  />
                ) : activeLabel === 'Requirements' ? (
                  <DocumentationSection 
                    key={`requirements-${refreshKey}`}
                    section="requirements" 
                    githubHref={githubHref}
                    showTOC={showTOC}
                    viewMode={viewMode}
                    onContentLoaded={handleContentLoaded}
                    onContentChange={handleContentChange}
                  />
                ) : (
                  <div style={{ 
                    padding: '60px 40px', 
                    textAlign: 'center', 
                    color: 'var(--docs-normal-text)' 
                  }}>
                    <h2 style={{ 
                      fontSize: '24px', 
                      fontWeight: '600', 
                      marginBottom: '16px',
                      color: 'var(--docs-header-text)' 
                    }}>
                      Welcome to the Repository
                    </h2>
                    <p style={{ 
                      fontSize: '16px', 
                      lineHeight: '1.6', 
                      maxWidth: '600px', 
                      margin: '0 auto 24px auto' 
                    }}>
                      Select an option from the sidebar to view changelog, system diagrams, or documentation.
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      justifyContent: 'center',
                      flexWrap: 'wrap'
                    }}>
                      <button 
                        onClick={() => {
                          const repoPath = window.location.pathname.split('/')[1]
                          navigate(`/${repoPath}/changelog`, { state: location.state })
                          setTimeout(() => window.location.reload(), 100)
                        }}
                        style={{
                          padding: '12px 24px',
                          border: '1px solid var(--sidebar-border)',
                          borderRadius: '8px',
                          background: 'var(--docs-bg)',
                          color: 'var(--docs-text)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        📋 View Changelog
                      </button>
                      <button 
                        onClick={() => {
                          const repoPath = window.location.pathname.split('/')[1]
                          navigate(`/${repoPath}/flowchart`, { state: location.state })
                          setTimeout(() => window.location.reload(), 100)
                        }}
                        style={{
                          padding: '12px 24px',
                          border: '1px solid var(--sidebar-border)',
                          borderRadius: '8px',
                          background: 'var(--docs-bg)',
                          color: 'var(--docs-text)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        📊 View Diagrams
                      </button>
                      <button 
                        onClick={() => {
                          const repoPath = window.location.pathname.split('/')[1]
                          navigate(`/${repoPath}/documentation`, { state: location.state })
                          setTimeout(() => window.location.reload(), 100)
                        }}
                        style={{
                          padding: '12px 24px',
                          border: '1px solid var(--sidebar-border)',
                          borderRadius: '8px',
                          background: 'var(--docs-bg)',
                          color: 'var(--docs-text)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        📚 View Documentation
                      </button>
                    </div>
                  </div>
                )}
          </div>
        </main>
      </div>
      
      {/* Bottom Mini Dialog */}
      <BottomMiniDialog
        content={documentationContent}
        mode={viewMode}
        onModeChange={(m) => setViewMode(m)}
      />

      {/* Floating Search Dialog */}
      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Suggestion Panel */}
      <SuggestionPanel 
        isOpen={isSuggestionPanelOpen} 
        onClose={() => setIsSuggestionPanelOpen(false)} 
      />

      {/* Context Menu */}
      <ContextMenu
        isVisible={contextMenu.isVisible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={handleContextMenuClose}
        onUpload={handleUploadClick}
      />

      {/* Folder Context Menu */}
      <FolderContextMenu
        isVisible={folderContextMenu.isVisible}
        x={folderContextMenu.x}
        y={folderContextMenu.y}
        onClose={handleFolderContextMenuClose}
        onNewNote={handleNewNote}
        onNewFolder={handleNewFolder}
        onRename={handleRename}
        onDelete={handleDelete}
      />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept="image/jpeg,image/jpg,image/png"
      />

      {/* View Code Dialog */}
      <ViewCodeDialog
        isOpen={isViewCodeDialogOpen}
        onClose={() => setIsViewCodeDialogOpen(false)}
        repoUrl={githubHref}
      />

      {/* Share Dialog */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        markdownContent=""
        documentationData={{}}
      />

      {/* Discord Notification Config Dialog */}
      <DiscordNotificationConfig
        isOpen={isDiscordConfigOpen}
        onClose={() => setIsDiscordConfigOpen(false)}
        repoUrl={githubHref}
        repoName={repo || 'Repository'}
        changelogUrl={`${window.location.origin}/changelog/${encodeURIComponent(githubHref)}`}
        onMonitoringStateChange={handleDiscordMonitoringStateChange}
      />

      {/* Auto Update Notification */}
      <AutoUpdateNotification
        newCommitsCount={newCommitsCount}
        latestCommits={latestCommits}
        lastUpdate={lastUpdate}
        onRefresh={async () => {
          try {
            await forceCheck()
            // Trigger content refresh
            setRefreshKey(prev => prev + 1)
            window.location.reload() // Force full page refresh to get latest content
          } catch (error) {
            console.error('Failed to refresh content:', error)
          }
        }}
        onDismiss={clearNotifications}
        repoUrl={githubHref !== '#' ? githubHref : undefined}
      />
    </div>
  )
}

export default DocumentationPage