import { useEffect, useRef, useState, useCallback } from 'react'
import './documentation_page.css'
import { GithubIcon } from '../components/icons/github_icon'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Markdown from '../components/markdown'
import TableOfContents from '../components/ui/table_of_content'
import { AnimatedThemeToggler } from '../components/theme'
import { BottomMiniDialog } from '../components/ui/bottom_mini_dialog'
import { SparklesIcon } from '../components/icons/sparkles_icon'
import { LightbulbIcon } from '../components/icons/lightbulb_icon'
import { useAIChat } from '../contexts/AIChatContext'
import SearchDialog from '../components/ui/search_dialog'
import SuggestionPanel from '../components/ui/suggestion_panel'
import ContextMenu from '../components/ui/context_menu'
import FolderContextMenu from '../components/ui/folder_context_menu'
import { GlobeIcon } from '../components/icons/globe_icon'
import { CodeIcon } from '../components/icons/code_icon'
import ShareDialog from '../components/ui/share_dialog'
import ViewCodeDialog from '../components/ui/view_code_dialog'
import { documentationApi, type Documentation } from '../services/api'

type DocItem =
  | { type: 'separator'; label: string }
  | { type: 'file'; label: string; href?: string }
  | { type: 'folder'; label: string; children: DocItem[] }

// API-based documentation loading

function Collapsible({ label, children, defaultOpen = false, storageKey, onRightClick }: { label: string; children: React.ReactNode; defaultOpen?: boolean; storageKey: string; onRightClick?: (e: React.MouseEvent) => void }) {
  const initialOpen = (() => {
    try {
      const saved = localStorage.getItem(`docsSidebarFolder:${storageKey}`)
      if (saved === 'open') return true
      if (saved === 'closed') return false
    } catch {
      console.log('localStorage error')
    }
    return defaultOpen
  })()
  const [open, setOpen] = useState(initialOpen)
  const contentRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<string>(initialOpen ? 'none' : '0px')
  const [allowTransitions, setAllowTransitions] = useState(false)

  // Enable transitions after initial render to prevent animation on page refresh
  useEffect(() => {
    const timer = setTimeout(() => {
      setAllowTransitions(true)
    }, 50) // Small delay to ensure DOM is ready
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Skip animation if transitions are not allowed yet
    if (!allowTransitions) {
      return
    }

    const el = contentRef.current
    if (!el) return
    if (open) {
      const height = el.scrollHeight
      // Set to pixel height first, then to 'none' after transition to allow dynamic content
      setMaxHeight(height + 'px')
      const id = window.setTimeout(() => setMaxHeight('none'), 240)
      return () => window.clearTimeout(id)
    } else {
      const height = el.scrollHeight
      // Force current height before collapsing to enable transition
      setMaxHeight(height + 'px')
      // Ensure the style is committed before transitioning to 0px
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMaxHeight('0px'))
      })
    }
  }, [open, allowTransitions])

  useEffect(() => {
    try {
      localStorage.setItem(`docsSidebarFolder:${storageKey}`, open ? 'open' : 'closed')
    } catch {
      console.log('localStorage error')
    }
  }, [open, storageKey])

  return (
    <div className="docs-folder">
      <button 
        className={`docs-folder__button ${open ? 'is-open' : ''}`} 
        aria-expanded={open} 
        onClick={() => setOpen((v) => !v)}
        onContextMenu={onRightClick}
      >
        <span>{label}</span>
        <span className="docs-folder__chevron" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </button>
      <div
        ref={contentRef}
        className={`docs-folder__children ${!allowTransitions ? 'no-transition' : ''}`}
        style={{ maxHeight, overflow: 'hidden' }}
        aria-hidden={!open}
      >
        {children}
      </div>
    </div>
  )
}

function slugify(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

function normalizeKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function renderItem(item: DocItem, idx: number, onFileClick: (label: string) => void, activeLabel: string | null, parentPath: string[] = [], onFolderItemRightClick?: (e: React.MouseEvent, itemType: 'file' | 'folder') => void) {
  if (item.type === 'separator') {
    return (
      <div key={`sep-${idx}`} className="docs-separator">
        {item.label}
      </div>
    )
  }
  if (item.type === 'file') {
    const isActive = activeLabel === item.label
    return (
      <button
        key={`file-${idx}`}
        className={`docs-file ${isActive ? 'is-active' : ''}`}
        type="button"
        onClick={() => onFileClick(item.label)}
        onContextMenu={(e) => onFolderItemRightClick?.(e, 'file')}
      >
        {item.label}
      </button>
    )
  }
  // folder
  const folderPath = [...parentPath, item.label]
  const storageKey = folderPath.map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')).join('/')
  return (
    <Collapsible 
      key={`folder-${idx}`} 
      label={item.label} 
      defaultOpen={item.label === 'Installation'} 
      storageKey={storageKey}
      onRightClick={(e) => onFolderItemRightClick?.(e, 'folder')}
    >
      {item.children.map((child, i) => (
        <div key={`child-${idx}-${i}`}>{renderItem(child, i, onFileClick, activeLabel, folderPath, onFolderItemRightClick)}</div>
      ))}
    </Collapsible>
  )
}

function DocumentationPage() {
  const location = useLocation() as { state?: { repoUrl?: string; repoData?: { name?: string; fullName?: string } } }
  const navigate = useNavigate()
  const { repo } = useParams<{ repo: string }>()
  const repoUrl = location.state?.repoUrl
  const fallbackUrl = location.state?.repoData?.name
    ? `https://github.com/${location.state.repoData.name.replace(/\s*\/\s*/, '/')}`
    : undefined
  const githubHref = repoUrl || fallbackUrl || '#'

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
  const [markdownContent, setMarkdownContent] = useState<string>('')
  const [draftContent, setDraftContent] = useState<string>('')
  const [viewMode, setViewMode] = useState<'reading' | 'edit'>('reading')
  
  // API-based documentation state
  const [documentationTree, setDocumentationTree] = useState<DocItem[]>([])
  const [documentationData, setDocumentationData] = useState<Record<string, Documentation>>({})
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)

  // Format file/folder labels for display
  const formatFileLabel = useCallback((key: string): string => {
    return key
      .replace(/\.(md|txt)$/i, '') // Remove file extensions
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }, [])

  // Load documentation on component mount and when repo changes
  useEffect(() => {
    if (!githubHref || githubHref === '#') return

    setIsLoadingDocs(true)
    setDocsError(null)
    

    
    // Convert API documentation data to tree structure
    const buildDocumentationTree = (docs: Record<string, Documentation>): DocItem[] => {
      const keys = Object.keys(docs)
      if (keys.length === 0) {
        return [
          { type: 'separator', label: 'Getting Started' },
          { type: 'file', label: 'Welcome' }
        ]
      }

      // Group keys by their path structure
      const tree: DocItem[] = []
      const folders: Record<string, DocItem[]> = {}
      
      keys.forEach(key => {
        const parts = key.split('/')
        if (parts.length === 1) {
          // Root level file
          tree.push({ type: 'file', label: formatFileLabel(key) })
        } else {
          // Nested file
          const folderName = parts[0]
          const fileName = parts.slice(1).join('/')
          if (!folders[folderName]) {
            folders[folderName] = []
          }
          folders[folderName].push({ type: 'file', label: formatFileLabel(fileName) })
        }
      })

      // Add folders to tree
      Object.entries(folders).forEach(([folderName, children]) => {
        tree.push({
          type: 'folder',
          label: formatFileLabel(folderName),
          children
        })
      })

      return tree
    }
    
    const loadDocs = async () => {
      try {
        const docs = await documentationApi.getAll(githubHref)
        setDocumentationData(docs)
        setDocumentationTree(buildDocumentationTree(docs))
        
        // Set default active label if none is set
        const keys = Object.keys(docs)
        if (keys.length > 0 && !activeLabel) {
          const firstKey = keys[0]
          setActiveLabel(formatFileLabel(firstKey))
        }
      } catch (error) {
        console.error('Failed to load documentation:', error)
        setDocsError(error instanceof Error ? error.message : 'Failed to load documentation')
        // Fallback to empty state
        setDocumentationTree([
          { type: 'separator', label: 'Error' },
          { type: 'file', label: 'Failed to Load' }
        ])
      } finally {
        setIsLoadingDocs(false)
      }
    }

    loadDocs()
  }, [githubHref, activeLabel, formatFileLabel])
  const [isScrolling, setIsScrolling] = useState(false)
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
  const { toggleChat } = useAIChat()
  const scrollTimeoutRef = useRef<number | null>(null)
  const treeRef = useRef<HTMLElement>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSuggestionPanelOpen, setIsSuggestionPanelOpen] = useState(false)
  const [showTOC, setShowTOC] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determine encoded repo slug for routing back to repo root
  const repoSlug = (() => {
    if (repo) return repo
    const fullName = location.state?.repoData?.fullName
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

  // Derive sidebar title: prefer fullName from state (case-preserved); fallback to owner/repo from repoUrl
  let sidebarTitle = 'Docs'
  if (location.state?.repoData?.fullName) {
    sidebarTitle = location.state.repoData.fullName
  } else if (repoUrl) {
    try {
      const url = new URL(repoUrl)
      sidebarTitle = url.pathname.replace(/^\//, '') || 'Docs'
    } catch {
      // ignore parse errors and keep default
    }
  }

  function handleFileClick(label: string) {
    setActiveLabel(label)
    const isOverview = label.trim().toLowerCase() === 'overview'
    // Find matching documentation key from API data
    let next = isOverview ? 'overview' : slugify(label)
    
    const docKeys = Object.keys(documentationData)
    const normalizedLabel = normalizeKey(label)
    const matched = docKeys.find((key) => {
      const formattedKey = formatFileLabel(key)
      return normalizeKey(formattedKey) === normalizedLabel
    })
    if (matched) {
      next = slugify(formatFileLabel(matched))
    }
    
    const path = `/${repoSlug}/${next}`
    navigate(path, { state: location.state })
  }

  // On first load or URL changes, ensure we are at /:repo/:file and sync active label
  useEffect(() => {
    const pathname = window.location.pathname.replace(/\/+$/, '')
    const parts = pathname.split('/').filter(Boolean)
    // parts example: [repo, file]
    const repoPart = parts[0] || repoSlug
    const filePart = parts[1]

    // Redirect /:repo -> /:repo/overview
    if (repoPart && !filePart) {
      navigate(`/${repoPart}/overview`, { replace: true, state: location.state })
      setActiveLabel('Overview')
      return
    }

    // Sync active label from slug in URL
    if (filePart) {
      const targetSlug = filePart.toLowerCase()
      const normTarget = normalizeKey(targetSlug)
      // find matching label in documentation tree (robust to hyphens/spaces)
      const collectLabels = (items: DocItem[], acc: string[] = []): string[] => {
        for (const it of items) {
          if (it.type === 'file') acc.push(it.label)
          if (it.type === 'folder') collectLabels(it.children, acc)
        }
        return acc
      }
      const allLabels = collectLabels(documentationTree)
      const matched = allLabels.find((l) => {
        const slug = slugify(l)
        return slug === targetSlug || normalizeKey(slug) === normTarget || normalizeKey(l) === normTarget
      })
      setActiveLabel(matched || 'Overview')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoSlug])

  // Load markdown file content for current active label from API
  useEffect(() => {
    if (!activeLabel || Object.keys(documentationData).length === 0) {
      setMarkdownContent('')
      setDraftContent('')
      return
    }

    // Find the documentation key that matches the active label
    const docKeys = Object.keys(documentationData)
    const normalizedActiveLabel = normalizeKey(activeLabel)
    
    const matchedKey = docKeys.find((key) => {
      const formattedKey = formatFileLabel(key)
      return normalizeKey(formattedKey) === normalizedActiveLabel
    })

    if (matchedKey && documentationData[matchedKey]) {
      const content = documentationData[matchedKey].content
      setMarkdownContent(content)
      setDraftContent(content)
    } else {
      // If no match found, show a placeholder
      const placeholderContent = `# ${activeLabel}\n\nDocumentation content for "${activeLabel}" is not available.`
      setMarkdownContent(placeholderContent)
      setDraftContent(placeholderContent)
    }
  }, [activeLabel, documentationData, formatFileLabel])

  // Handle scroll events
  const handleScroll = () => {
    setIsScrolling(true)
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Set new timeout to hide scrollbar after 2 seconds
    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false)
    }, 2000)
  }

  // Set up scroll event listener
  useEffect(() => {
    const treeElement = treeRef.current
    if (treeElement) {
      treeElement.addEventListener('scroll', handleScroll)
      
      return () => {
        treeElement.removeEventListener('scroll', handleScroll)
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
      }
    }
  }, [])

  // Auto-resize textarea when content changes or view mode changes
  useEffect(() => {
    if (viewMode === 'edit' && textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  }, [draftContent, viewMode])

  const handleSidebarToggle = () => {
    const newState = !isSidebarCollapsed
    setIsSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
  }

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

  const handleFolderItemRightClick = (e: React.MouseEvent, itemType: 'file' | 'folder') => {
    e.preventDefault()
    setFolderContextMenu({
      isVisible: true,
      x: e.clientX,
      y: e.clientY,
      itemType
    })
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

      {/* Lightbulb Button - Above AI Chat Button */}
      <div className="docs-lightbulb-button-container">
        <button 
          className="docs-lightbulb-button"
          onClick={() => setIsSuggestionPanelOpen(prev => !prev)}
          aria-label="Open suggestions"
        >
          <LightbulbIcon size={18} />
        </button>
      </div>

      {/* AI Chat Button - Top Right Corner */}
      <div className="docs-ai-chat-button-container">
        <button 
          className="docs-ai-chat-button"
          onClick={toggleChat}
          aria-label="Open AI chat"
        >
          <SparklesIcon size={18} />
        </button>
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
          <nav 
            ref={treeRef}
            className={`docs-tree ${isScrolling ? 'is-scrolling' : ''}`} 
            aria-label="Documentation navigation"
          >
            <div className="docs-tree__content">
              {isLoadingDocs ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--docs-subtle-text)' }}>
                  Loading documentation...
                </div>
              ) : docsError ? (
                <div style={{ padding: '20px', color: 'var(--docs-error-text)' }}>
                  <div style={{ marginBottom: '8px' }}>Failed to load documentation</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>{docsError}</div>
                </div>
              ) : documentationTree.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--docs-subtle-text)' }}>
                  No documentation available
                </div>
              ) : (
                documentationTree.map((it, i) => renderItem(it, i, handleFileClick, activeLabel, [], handleFolderItemRightClick))
              )}
            </div>
          </nav>
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
            {viewMode === 'edit' ? (
              <textarea
                ref={textareaRef}
                className="docs-edit-textarea"
                value={draftContent}
                onChange={(e) => {
                  setDraftContent(e.target.value)
                  // Auto-resize textarea to fit content
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                style={{
                  width: '110%',
                  minHeight: '100vh',
                  height: 'auto',
                  padding: '12px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: 'var(--docs-normal-text)',
                  background: 'var(--docs-bg)',
                  border: 'none',
                  borderRadius: 8,
                  outline: 'none',
                  resize: 'none',
                  overflow: 'hidden'
                }}
              />
            ) : (
              <>
                <Markdown content={draftContent || markdownContent} />
                {showTOC && <TableOfContents content={draftContent || markdownContent} />}
              </>
            )}
          </div>
        </main>
      </div>
      
      {/* Bottom Mini Dialog */}
      <BottomMiniDialog
        content={viewMode === 'edit' ? draftContent : markdownContent}
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
    </div>
  )
}

export default DocumentationPage
