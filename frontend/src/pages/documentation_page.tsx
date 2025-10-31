import { useCallback, useEffect, useRef, useState } from 'react'
import './documentation_page.css'
import { GithubIcon } from '../components/icons/github_icon'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatedThemeToggler } from '../components/theme'
import { BottomMiniDialog } from '../components/ui/bottom_mini_dialog'
import { useAIChat } from '../contexts/AIChatContext'
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
import Markdown from '../components/markdown'
import MarkdownEditor from '../components/ui/markdown_editor'
import ExportDialog from '../components/ui/export_dialog'
import EmbeddedChangelog from '../components/embedded_changelog'
import EmbeddedFlowchart from '../components/embedded_flowchart'
import { ExportIcon } from '../components/icons/export_icon'
import { useAutoUpdate } from '../hooks/useAutoUpdate'
import AutoUpdateNotification from '../components/ui/auto_update_notification'
import type { GitHubCommit, Documentation } from '../services/api'
import { gitHubWebhookService } from '../services/github-webhook-service'
import { documentationApi } from '../services/api'

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
  
  // Document loading state
  const [documents, setDocuments] = useState<Record<string, Documentation>>({})
  const [documentKeys, setDocumentKeys] = useState<string[]>([])
  const [selectedDocKey, setSelectedDocKey] = useState<string | null>(null)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)
  
  // Editing state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  
  // Agent activity tracking
  const [isAgentActive, setIsAgentActive] = useState(false)
  const pollTimerRef = useRef<number | null>(null)
  
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
  // Compute initial active label from current pathname to avoid flashing the welcome screen
  const computeInitialActiveLabel = (): string | null => {
    try {
      const pathname = (location && location.pathname ? location.pathname : window.location.pathname).replace(/\/+/g, '/')
      const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
      const repoPart = parts[0]
      const filePart = parts[1]

      if (repoPart && !filePart) {
        // Default to showing the first documentation file instead of the welcome screen
        return 'Overview'
      }

      if (filePart) {
        const targetSlug = filePart.toLowerCase()
        if (targetSlug === 'changelog') return 'Changelog'
        if (targetSlug === 'flowchart') return 'System Diagrams'
        if (targetSlug === 'documentation') return 'Main Documentation'
        if (targetSlug === 'docs') {
          const docsIndex = parts.indexOf('docs')
          const subSection = parts[docsIndex + 1]
          if (subSection === 'overview') return 'Overview'
          if (subSection === 'quickstart') return 'Quick Start'
          if (subSection === 'requirements') return 'Requirements'
        }
      }
    } catch (err) {
      // If anything goes wrong, fall back to null so the existing effects handle it
      console.error('computeInitialActiveLabel error', err)
    }
    return null
  }

  const [activeLabel, setActiveLabel] = useState<string | null>(computeInitialActiveLabel)
  const [viewMode, setViewMode] = useState<'reading' | 'edit'>('reading')
  const [documentationContent, setDocumentationContent] = useState<string>('')

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
  const { setRepositoryInfo } = useAIChat()

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Auto-update functionality (used by changelog/flowchart special pages)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [refreshKey, setRefreshKey] = useState(0)
  
  const {
    lastUpdate,
    newCommitsCount,
    latestCommits,
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
  const [, setIsGitHubBotEnabled] = useState(false)
  
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

  // Load all documents from API
  useEffect(() => {
    if (!githubHref || githubHref === '#') {
      setDocuments({})
      setDocumentKeys([])
      setSelectedDocKey(null)
      return
    }

    setIsLoadingDocs(true)
    setDocsError(null)

    documentationApi.getAll(githubHref, 'main')
      .then((docs) => {
        setDocuments(docs)
        const keys = Object.keys(docs).sort()
        setDocumentKeys(keys)
        
        // Auto-select first document if none selected
        if (!selectedDocKey && keys.length > 0) {
          setSelectedDocKey(keys[0])
        }
      })
      .catch((err) => {
        console.error('Failed to load documents:', err)
        setDocsError(err.message || 'Failed to load documents')
        setDocuments({})
        setDocumentKeys([])
      })
      .finally(() => {
        setIsLoadingDocs(false)
      })
  }, [githubHref]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync edited content when document changes (but NOT during agent activity to prevent overwriting)
  useEffect(() => {
    if (selectedDocKey && documents[selectedDocKey] && !isAgentActive) {
      // Defensive: if content is double-encoded JSON string, parse it
      let actualContent = documents[selectedDocKey].content || ''
      try {
        // Check if it's a stringified string (starts and ends with quotes)
        if (actualContent.startsWith('"') && actualContent.endsWith('"')) {
          actualContent = JSON.parse(actualContent)
        }
      } catch (e) {
        // If parsing fails, use as-is
      }
      
      setEditedContent(actualContent)
      setIsEditMode(false) // Exit edit mode when switching documents
      setSaveError(null)
    }
  }, [selectedDocKey, documents, isAgentActive])

  // Auto-save with debouncing
  const handleContentEdit = useCallback((newContent: string) => {
    setEditedContent(newContent)
    setSaveError(null)
    
    // Clear existing timer
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }
    
    // Set new timer for auto-save (2 seconds debounce)
    saveTimerRef.current = window.setTimeout(() => {
      if (!githubHref || !selectedDocKey) return
      
      setIsSaving(true)
      documentationApi.update(githubHref, selectedDocKey, newContent, 'main')
        .then(() => {
          // Update local state
          setDocuments(prev => ({
            ...prev,
            [selectedDocKey]: {
              ...prev[selectedDocKey],
              content: newContent,
              lastUpdated: new Date().toISOString()
            }
          }))
          setIsSaving(false)
        })
        .catch((err) => {
          console.error('Failed to save document:', err)
          setSaveError(err.message || 'Failed to save changes')
          setIsSaving(false)
        })
    }, 2000)
  }, [githubHref, selectedDocKey])

  // Cleanup save timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  // Poll for document updates when agent is active
  useEffect(() => {
    if (!isAgentActive || !githubHref) {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }

    // Poll every 2 seconds - fetch ALL documents to catch new ones
    pollTimerRef.current = window.setInterval(() => {
      documentationApi.getAll(githubHref, 'main')
        .then((docs) => {
          setDocuments(docs)
          const keys = Object.keys(docs).sort()
          setDocumentKeys(keys)
          
          // Update edited content if we're still on a document
          if (selectedDocKey && docs[selectedDocKey]) {
            // Defensive: if content is double-encoded JSON string, parse it
            let actualContent = docs[selectedDocKey].content || ''
            try {
              if (actualContent.startsWith('"') && actualContent.endsWith('"')) {
                actualContent = JSON.parse(actualContent)
              }
            } catch (e) {
              // If parsing fails, use as-is
            }
            setEditedContent(actualContent)
          }
        })
        .catch((err: Error) => {
          console.error('Failed to poll documents:', err)
        })
    }, 2000)

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [isAgentActive, githubHref, selectedDocKey])

  // Listen for agent activity from AI chat
  useEffect(() => {
    const handleAgentStart = () => {
      setIsAgentActive(true)
      setIsEditMode(false) // Disable editing when agent starts
    }
    
    const handleAgentComplete = () => {
      setIsAgentActive(false)
      // Refresh ALL documents (in case agent created new ones)
      if (githubHref) {
        documentationApi.getAll(githubHref, 'main')
          .then((docs) => {
            setDocuments(docs)
            const keys = Object.keys(docs).sort()
            setDocumentKeys(keys)
            
            // Update edited content if we're still on a document
            if (selectedDocKey && docs[selectedDocKey]) {
              // Defensive: if content is double-encoded JSON string, parse it
              let actualContent = docs[selectedDocKey].content || ''
              try {
                if (actualContent.startsWith('"') && actualContent.endsWith('"')) {
                  actualContent = JSON.parse(actualContent)
                }
              } catch (e) {
                // If parsing fails, use as-is
              }
              setEditedContent(actualContent)
            }
          })
          .catch((err: Error) => {
            console.error('Failed to refresh documents:', err)
          })
      }
    }

    window.addEventListener('agent-started', handleAgentStart)
    window.addEventListener('agent-completed', handleAgentComplete)

    return () => {
      window.removeEventListener('agent-started', handleAgentStart)
      window.removeEventListener('agent-completed', handleAgentComplete)
    }
  }, [githubHref, selectedDocKey])

  // Handle Esc key to exit edit mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditMode) {
        setIsEditMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEditMode])

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

    // Handle root repo path - navigate directly to first documentation file (Overview)
    if (repoPart && !filePart) {
      try {
        const target = `/${repoPart}/docs/overview`
        console.log('No file specified; redirecting to first documentation page:', target)
        // Use replace to avoid adding an extra history entry for the welcome page
        navigate(target, { state: location.state, replace: true })
      } catch (err) {
        console.error('Redirect to overview failed, falling back to welcome state', err)
        setActiveLabel('Welcome')
        setRefreshKey(prev => prev + 1) // Force refresh
      }
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

      {/* Tools dropdown removed (user request) */}

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
              <h3>Documentation Files</h3>
            </div>
            <div className="docs-sidebar__nav">
              {isLoadingDocs ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--docs-normal-text)' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : docsError ? (
                <div style={{ padding: '12px', color: 'var(--danger-color)', fontSize: '14px' }}>
                  {docsError}
                </div>
              ) : documentKeys.length === 0 ? (
                <div style={{ padding: '12px', color: 'var(--docs-normal-text)', fontSize: '14px' }}>
                  No documentation files found
                </div>
              ) : (
                documentKeys.map((key) => (
                  <button
                    key={key}
                    className={`docs-sidebar__nav-item ${selectedDocKey === key ? 'is-active' : ''}`}
                    onClick={() => setSelectedDocKey(key)}
                    aria-label={`View ${key}`}
                  >
                    <span>{key}</span>
                  </button>
                ))
              )}
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
            ) : selectedDocKey && documents[selectedDocKey] ? (
              <div className="documentation-section">
                {/* Edit/Read mode toggle toolbar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--sidebar-border)',
                  marginBottom: '20px'
                }}>
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    disabled={isAgentActive}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid var(--sidebar-border)',
                      background: isEditMode ? 'var(--primary-color)' : 'var(--docs-bg)',
                      color: isEditMode ? '#fff' : 'var(--docs-text)',
                      cursor: isAgentActive ? 'not-allowed' : 'pointer',
                      opacity: isAgentActive ? 0.5 : 1,
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isEditMode ? '� Markdown Mode' : '📄 Raw Mode'}
                  </button>
                  
                  {isSaving && (
                    <span style={{ fontSize: '14px', color: 'var(--docs-normal-text)' }}>
                      💾 Saving...
                    </span>
                  )}
                  
                  {saveError && (
                    <span style={{ fontSize: '14px', color: 'var(--danger-color)' }}>
                      ❌ {saveError}
                    </span>
                  )}
                  
                  {isAgentActive && (
                    <span style={{ fontSize: '14px', color: 'var(--primary-color)' }}>
                      🤖 Agent is working...
                    </span>
                  )}
                  
                  <span style={{ 
                    fontSize: '12px', 
                    color: 'var(--docs-normal-text)', 
                    marginLeft: 'auto',
                    opacity: 0.7
                  }}>
                    {selectedDocKey}
                  </span>
                </div>

                {/* Content area - show content even during agent activity */}
                {isEditMode ? (
                  <MarkdownEditor
                    content={editedContent}
                    onContentChange={handleContentEdit}
                    placeholder="Start editing your documentation..."
                  />
                ) : (
                  <div onDoubleClick={() => !isAgentActive && setIsEditMode(true)}>
                    <Markdown content={editedContent || documents[selectedDocKey]?.content || ''} />
                  </div>
                )}
              </div>
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
                  {isLoadingDocs ? 'Loading documentation...' : 
                   docsError ? 'Error loading documentation' :
                   documentKeys.length === 0 ? 'No documentation found' :
                   'Select a file from the sidebar'}
                </h2>
                {docsError && (
                  <p style={{ 
                    fontSize: '14px', 
                    color: 'var(--danger-color)',
                    margin: '16px auto',
                    maxWidth: '600px'
                  }}>
                    {docsError}
                  </p>
                )}
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