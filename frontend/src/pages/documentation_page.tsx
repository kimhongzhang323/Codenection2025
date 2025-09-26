import { useEffect, useRef, useState } from 'react'
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
import { HistoryIcon } from '../components/icons/history_icon'
import { DiagramIcon } from '../components/icons/diagram_icon'
import ShareDialog from '../components/ui/share_dialog'
import ViewCodeDialog from '../components/ui/view_code_dialog'
import ExportDialog from '../components/ui/export_dialog'
import EmbeddedChangelog from '../components/embedded_changelog'
import EmbeddedFlowchart from '../components/embedded_flowchart'
import { documentationApi, type Documentation } from '../services/api'
import { ExportIcon } from '../components/icons/export_icon'






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
  
  // Documentation API state - only used for Documentation view
  const [documentationData, setDocumentationData] = useState<Record<string, Documentation>>({})
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  




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
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        return
      } else if (targetSlug === 'flowchart') {
        console.log('Setting activeLabel to System Diagrams')
        setActiveLabel('System Diagrams')
        return
      } else if (targetSlug === 'documentation') {
        console.log('Setting activeLabel to Documentation')
        setActiveLabel('Documentation')
        return
      }
    }
  }, [location.pathname, repoSlug, subpage, activeLabel])

  // Load documentation when Documentation view is active
  useEffect(() => {
    if (activeLabel === 'Documentation' && githubHref && githubHref !== '#') {
      setIsLoadingDocs(true)
      
      const loadDocs = async () => {
        try {
          const docs = await documentationApi.getAll(githubHref)
          setDocumentationData(docs)
          
          // Helper function to detect language from file extension
          const getLanguageFromExtension = (filename: string): string => {
            const ext = filename.toLowerCase().split('.').pop() || ''
            const languageMap: Record<string, string> = {
              'js': 'javascript',
              'jsx': 'jsx',
              'ts': 'typescript',
              'tsx': 'tsx',
              'py': 'python',
              'java': 'java',
              'cpp': 'cpp',
              'c': 'c',
              'cs': 'csharp',
              'php': 'php',
              'rb': 'ruby',
              'go': 'go',
              'rs': 'rust',
              'kt': 'kotlin',
              'swift': 'swift',
              'scala': 'scala',
              'sh': 'bash',
              'bash': 'bash',
              'zsh': 'zsh',
              'fish': 'fish',
              'ps1': 'powershell',
              'sql': 'sql',
              'html': 'html',
              'htm': 'html',
              'xml': 'xml',
              'css': 'css',
              'scss': 'scss',
              'sass': 'sass',
              'less': 'less',
              'json': 'json',
              'yaml': 'yaml',
              'yml': 'yaml',
              'toml': 'toml',
              'ini': 'ini',
              'cfg': 'ini',
              'conf': 'ini',
              'properties': 'properties',
              'dockerfile': 'dockerfile',
              'md': 'markdown',
              'mdx': 'mdx',
              'tex': 'latex',
              'r': 'r',
              'matlab': 'matlab',
              'm': 'matlab',
              'pl': 'perl',
              'lua': 'lua',
              'vim': 'vim',
              'diff': 'diff',
              'patch': 'diff',
              'log': 'log',
              'txt': 'text'
            }
            return languageMap[ext] || 'text'
          }

          // Helper function to format file title
          const formatFileTitle = (key: string): string => {
            return key
              .replace(/\.(md|txt)$/i, '') // Remove common doc extensions
              .split(/[-_]/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
          }

          // Helper function to get file type info with icons
          const getFileTypeInfo = (filename: string): { category: string; icon: string; language: string } => {
            const ext = filename.toLowerCase().split('.').pop() || ''
            const name = filename.toLowerCase()
            
            // Special files
            if (name.includes('readme')) return { category: 'documentation', icon: '📖', language: 'markdown' }
            if (name.includes('license')) return { category: 'documentation', icon: '📄', language: 'text' }
            if (name.includes('changelog')) return { category: 'documentation', icon: '📝', language: 'markdown' }
            if (name.includes('dockerfile') || name === 'dockerfile') return { category: 'configuration', icon: '🐳', language: 'dockerfile' }
            if (name.includes('makefile') || name === 'makefile') return { category: 'configuration', icon: '🔧', language: 'makefile' }
            if (name.includes('package.json')) return { category: 'configuration', icon: '📦', language: 'json' }
            if (name.includes('requirements.txt')) return { category: 'configuration', icon: '🐍', language: 'text' }
            if (name.includes('pom.xml')) return { category: 'configuration', icon: '☕', language: 'xml' }
            if (name.includes('build.gradle')) return { category: 'configuration', icon: '🐘', language: 'groovy' }
            
            const fileTypes: Record<string, { category: string; icon: string; language: string }> = {
              // Programming languages
              'js': { category: 'source', icon: '🟨', language: 'javascript' },
              'jsx': { category: 'source', icon: '⚛️', language: 'jsx' },
              'ts': { category: 'source', icon: '🔷', language: 'typescript' },
              'tsx': { category: 'source', icon: '⚛️', language: 'tsx' },
              'py': { category: 'source', icon: '🐍', language: 'python' },
              'java': { category: 'source', icon: '☕', language: 'java' },
              'cpp': { category: 'source', icon: '⚙️', language: 'cpp' },
              'c': { category: 'source', icon: '⚙️', language: 'c' },
              'cs': { category: 'source', icon: '🔷', language: 'csharp' },
              'php': { category: 'source', icon: '🐘', language: 'php' },
              'rb': { category: 'source', icon: '💎', language: 'ruby' },
              'go': { category: 'source', icon: '🐹', language: 'go' },
              'rs': { category: 'source', icon: '🦀', language: 'rust' },
              'kt': { category: 'source', icon: '🟣', language: 'kotlin' },
              'swift': { category: 'source', icon: '🦉', language: 'swift' },
              'scala': { category: 'source', icon: '🔴', language: 'scala' },
              'dart': { category: 'source', icon: '🎯', language: 'dart' },
              
              // Web technologies
              'html': { category: 'source', icon: '🌐', language: 'html' },
              'css': { category: 'source', icon: '🎨', language: 'css' },
              'scss': { category: 'source', icon: '🎨', language: 'scss' },
              'sass': { category: 'source', icon: '🎨', language: 'sass' },
              'less': { category: 'source', icon: '🎨', language: 'less' },
              
              // Data formats
              'json': { category: 'configuration', icon: '📋', language: 'json' },
              'yaml': { category: 'configuration', icon: '📋', language: 'yaml' },
              'yml': { category: 'configuration', icon: '📋', language: 'yaml' },
              'xml': { category: 'configuration', icon: '📋', language: 'xml' },
              'toml': { category: 'configuration', icon: '📋', language: 'toml' },
              'ini': { category: 'configuration', icon: '⚙️', language: 'ini' },
              'cfg': { category: 'configuration', icon: '⚙️', language: 'ini' },
              'conf': { category: 'configuration', icon: '⚙️', language: 'ini' },
              'properties': { category: 'configuration', icon: '⚙️', language: 'properties' },
              
              // Documentation
              'md': { category: 'documentation', icon: '📝', language: 'markdown' },
              'txt': { category: 'documentation', icon: '📄', language: 'text' },
              'rst': { category: 'documentation', icon: '📝', language: 'rest' },
              'adoc': { category: 'documentation', icon: '📝', language: 'asciidoc' },
              
              // Scripts
              'sh': { category: 'source', icon: '🐚', language: 'bash' },
              'bash': { category: 'source', icon: '🐚', language: 'bash' },
              'ps1': { category: 'source', icon: '💠', language: 'powershell' },
              'bat': { category: 'source', icon: '⬛', language: 'batch' },
              'cmd': { category: 'source', icon: '⬛', language: 'batch' },
              
              // Database
              'sql': { category: 'source', icon: '🗃️', language: 'sql' },
              
              // Others
              'log': { category: 'other', icon: '📊', language: 'log' },
              'csv': { category: 'other', icon: '📊', language: 'csv' },
              'env': { category: 'configuration', icon: '🔐', language: 'bash' }
            }
            
            return fileTypes[ext] || { category: 'other', icon: '📄', language: 'text' }
          }

          // Separate files by category for better organization
          const categorizeFiles = (docs: Record<string, Documentation>) => {
            const categories = {
              readme: [] as Array<[string, Documentation]>,
              documentation: [] as Array<[string, Documentation]>,
              configuration: [] as Array<[string, Documentation]>,
              source: [] as Array<[string, Documentation]>,
              other: [] as Array<[string, Documentation]>
            }

            Object.entries(docs).forEach(([key, doc]) => {
              const lower = key.toLowerCase()
              if (lower.includes('readme')) {
                categories.readme.push([key, doc])
              } else if (lower.match(/\.(md|txt|rst|adoc)$/)) {
                categories.documentation.push([key, doc])
              } else if (lower.match(/\.(json|yaml|yml|toml|ini|cfg|conf|properties|xml)$/)) {
                categories.configuration.push([key, doc])
              } else if (lower.match(/\.(js|jsx|ts|tsx|py|java|cpp|c|cs|php|rb|go|rs|kt|swift|scala|html|css|scss|sass)$/)) {
                categories.source.push([key, doc])
              } else {
                categories.other.push([key, doc])
              }
            })

            return categories
          }

          const categories = categorizeFiles(docs)
          const sections: string[] = []

          // Generate README section
          if (categories.readme.length > 0) {
            sections.push('# 📖 README')
            categories.readme.forEach(([key, doc]) => {
              const title = formatFileTitle(key)
              sections.push(`## ${title}\n\n${doc.content}`)
            })
          }

          // Generate Documentation section
          if (categories.documentation.length > 0) {
            sections.push('# 📚 Documentation Files')
            categories.documentation.forEach(([key, doc]) => {
              const title = formatFileTitle(key)
              sections.push(`## 📝 ${title}\n\n${doc.content}`)
            })
          }

          // Generate Configuration section
          if (categories.configuration.length > 0) {
            sections.push('# ⚙️ Configuration Files')
            categories.configuration.forEach(([key, doc]) => {
              const title = formatFileTitle(key)
              const language = getLanguageFromExtension(key)
              const fileIcon = getFileTypeInfo(key).icon
              sections.push(`## ${fileIcon} ${title}\n\n\`\`\`${language} title="${key}"\n${doc.content}\n\`\`\``)
            })
          }

          // Generate Source Code section
          if (categories.source.length > 0) {
            sections.push('# 💻 Source Code')
            categories.source.forEach(([key, doc]) => {
              const title = formatFileTitle(key)
              const language = getLanguageFromExtension(key)
              const fileIcon = getFileTypeInfo(key).icon
              sections.push(`## ${fileIcon} ${title}\n\n\`\`\`${language} title="${key}"\n${doc.content}\n\`\`\``)
            })
          }

          // Generate Other Files section
          if (categories.other.length > 0) {
            sections.push('# 📄 Other Files')
            categories.other.forEach(([key, doc]) => {
              const title = formatFileTitle(key)
              const language = getLanguageFromExtension(key)
              const fileIcon = getFileTypeInfo(key).icon
              sections.push(`## ${fileIcon} ${title}\n\n\`\`\`${language} title="${key}"\n${doc.content}\n\`\`\``)
            })
          }

          const allContent = sections.join('\n\n---\n\n')
          
          setMarkdownContent(allContent)
          setDraftContent(allContent)
        } catch (error) {
          console.error('Failed to load documentation:', error)
          const errorContent = `# Documentation\n\nFailed to load documentation content. Please try again later.`
          setMarkdownContent(errorContent)
          setDraftContent(errorContent)
        } finally {
          setIsLoadingDocs(false)
        }
      }

      loadDocs()
    }
  }, [activeLabel, githubHref])

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
                className="docs-sidebar__nav-item"
                onClick={() => {
                  const repoPath = window.location.pathname.split('/')[1]
                  navigate(`/${repoPath}/changelog`, {
                    state: location.state
                  })
                }}
                aria-label="View Changelog"
              >
                <HistoryIcon size={16} />
                <span>Changelog</span>
              </button>
              
              <button 
                className="docs-sidebar__nav-item"
                onClick={() => {
                  const repoPath = window.location.pathname.split('/')[1]
                  navigate(`/${repoPath}/flowchart`, {
                    state: location.state
                  })
                }}
                aria-label="View System Diagrams"
              >
                <DiagramIcon size={16} />
                <span>System Diagrams</span>
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
                className="docs-sidebar__nav-item"
                onClick={() => {
                  const repoPath = window.location.pathname.split('/')[1]
                  navigate(`/${repoPath}/documentation`, {
                    state: location.state
                  })
                }}
                aria-label="View Documentation"
              >
                <span>📚</span>
                <span>Main Documentation</span>
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
                ) : activeLabel === 'Documentation' ? (
                  <div className="documentation-main">
                    {isLoadingDocs ? (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        minHeight: '200px',
                        color: 'var(--docs-normal-text)' 
                      }}>
                        <div>
                          <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
                          <p>Loading documentation...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Markdown content={draftContent || markdownContent} />
                        {showTOC && <TableOfContents content={draftContent || markdownContent} />}
                      </>
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

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        markdownContent={markdownContent}
        documentationData={documentationData}
      />
    </div>
  )
}

export default DocumentationPage
