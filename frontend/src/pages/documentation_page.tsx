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
import ShareDialog from '../components/ui/share_dialog'
import ViewCodeDialog from '../components/ui/view_code_dialog'
import DocumentationSection from '../components/documentation_section'
import ExportDialog from '../components/ui/export_dialog'
import { ExportIcon } from '../components/icons/export_icon'

function DocumentationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { repo, subpage } = useParams<{ repo: string; subpage?: string }>()
  const locationState = location.state as
    | { repoUrl?: string; repoData?: { name?: string; fullName?: string } }
    | undefined

  const repoUrl =
    locationState?.repoUrl ||
    (repo ? `https://github.com/${decodeURIComponent(repo)}` : '#')

  const [isDarkSelected, setIsDarkSelected] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) return saved === 'dark'
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const computeInitialActiveLabel = (): string | null => {
    try {
      const pathname =
        (location && location.pathname ? location.pathname : window.location.pathname).replace(
          /\/+/g,
          '/'
        )
      const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
      const repoPart = parts[0]
      const filePart = parts[1]

      if (repoPart && !filePart) return 'Overview'

      if (filePart) {
        const targetSlug = filePart.toLowerCase()
        if (targetSlug === 'documentation') return 'Main Documentation'
        if (targetSlug === 'docs') {
          const docsIndex = parts.indexOf('docs')
          const subSection = parts[docsIndex + 1]
          if (subSection === 'overview') return 'Overview'
          if (subSection === 'quickstart') return 'Quick Start'
          if (subSection === 'requirements') return 'Requirements'
        }
      }
    } catch {
      return null
    }
    return null
  }

  const [activeLabel, setActiveLabel] = useState<string | null>(computeInitialActiveLabel)
  const [viewMode, setViewMode] = useState<'reading' | 'edit'>('reading')
  const [documentationContent, setDocumentationContent] = useState<string>('')

  const handleContentLoaded = useCallback((section: string, content: string) => {
    setDocumentationContent(content)
  }, [])

  const handleContentChange = useCallback((content: string) => {
    setDocumentationContent(content)
  }, [])

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      window.innerWidth <= 768 ||
      'ontouchstart' in window
    const isVerySmall = window.innerWidth <= 1024
    const saved = localStorage.getItem('sidebarCollapsed')

    if (isMobileDevice) return true
    if (isVerySmall) return saved ? JSON.parse(saved) : true
    return saved ? JSON.parse(saved) : false
  })

  const { toggleChat, setRepositoryInfo } = useAIChat()

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSuggestionPanelOpen, setIsSuggestionPanelOpen] = useState(false)
  const [showTOC, setShowTOC] = useState(true)

  const [contextMenu, setContextMenu] = useState<{ isVisible: boolean; x: number; y: number }>({
    isVisible: false,
    x: 0,
    y: 0,
  })
  const [folderContextMenu, setFolderContextMenu] = useState<{
    isVisible: boolean
    x: number
    y: number
    itemType: 'file' | 'folder' | null
  }>({
    isVisible: false,
    x: 0,
    y: 0,
    itemType: null,
  })
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isViewCodeDialogOpen, setIsViewCodeDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (repoUrl && repoUrl !== '#') setRepositoryInfo(repoUrl, 'main')
  }, [repoUrl, setRepositoryInfo])

  const handleSidebarToggle = useCallback(() => {
    const newState = !isSidebarCollapsed
    setIsSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
  }, [isSidebarCollapsed])

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
      y: e.clientY,
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
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string
        const logoElement = document.querySelector('.docs-sidebar__logo') as HTMLImageElement
        if (logoElement) logoElement.src = imageUrl
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFolderContextMenuClose = () =>
    setFolderContextMenu({ isVisible: false, x: 0, y: 0, itemType: null })

  const handleThemeToggle = (isDark: boolean) => {
    setIsDarkSelected(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  useEffect(() => {
    if (isDarkSelected) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [isDarkSelected])

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth
      const isMobile = windowWidth <= 768
      const isVerySmall = windowWidth <= 1024

      if ((isMobile || isVerySmall) && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true)
        localStorage.setItem('sidebarCollapsed', JSON.stringify(true))
      }

      const sidebarWidth = isSidebarCollapsed ? 0 : 260
      const contentWidth = 720
      const tocWidth = 200
      const gaps = 60
      const minSpaceNeeded = sidebarWidth + contentWidth + tocWidth + gaps
      setShowTOC(windowWidth >= minSpaceNeeded && windowWidth > 1500)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isSidebarCollapsed])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault()
        handleSidebarToggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSidebarToggle])

  const sidebarTitle =
    locationState?.repoData?.fullName?.split('/')[1] ??
    locationState?.repoData?.fullName ??
    'Docs'

  return (
    <div className="documentation-page">
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
                filter: isDarkSelected ? 'brightness(0) invert(1)' : 'brightness(0)',
              }}
            />
          </button>
        </div>
      )}

      <div className="docs-tools-dropdown-container">
        <ToolsDropdown onToggleAIChat={toggleChat} />
      </div>

      <div className="docs-view-code-button-container">
        <button
          className="docs-view-code-button"
          onClick={() => setIsViewCodeDialogOpen(true)}
          aria-label="View code"
        >
          <CodeIcon size={16} />
          <span>View Code</span>
        </button>
      </div>

      <div className="docs-share-button-container">
        <button
          className="docs-share-button"
          onClick={() => setIsShareDialogOpen(true)}
          aria-label="Share this page"
        >
          <GlobeIcon size={16} />
          <span>Share</span>
        </button>
      </div>

      <div className="docs-export-button-container">
        <button
          className="docs-export-button"
          onClick={() => setIsExportDialogOpen(true)}
          aria-label="Export documentation"
        >
          <ExportIcon size={16} />
          <span>Export</span>
        </button>
      </div>

      <div className={`docs-layout ${isSidebarCollapsed ? 'is-collapsed' : ''}`} onClick={handleOverlayClick}>
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
                  filter: isDarkSelected ? 'brightness(0) invert(1)' : 'brightness(0)',
                }}
              />
            </div>
            <div
              className="docs-sidebar__search"
              onClick={() => setIsSearchOpen(true)}
              role="button"
              aria-label="Open search"
            >
              <svg
                className="docs-sidebar__search-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input type="text" placeholder="Search" readOnly />
              <div className="docs-sidebar__search-shortcut">
                <span className="docs-sidebar__search-shortcut-key">Ctrl</span>
                <span className="docs-sidebar__search-shortcut-key">K</span>
              </div>
            </div>
          </div>

          <div className="docs-sidebar__section">
            <div className="docs-sidebar__section-header">
              <h3>Documentation</h3>
            </div>
            <div className="docs-sidebar__nav">
              {['Overview', 'Quick Start', 'Requirements', 'Main Documentation'].map((label) => (
                <button
                  key={label}
                  className={`docs-sidebar__nav-item ${activeLabel === label ? 'is-active' : ''}`}
                  onClick={() => {
                    const repoPath = window.location.pathname.split('/')[1]
                    const path =
                      label === 'Main Documentation'
                        ? `/${repoPath}/documentation`
                        : `/${repoPath}/docs/${label.toLowerCase().replace(' ', '')}`
                    navigate(path, { state: location.state })
                    setActiveLabel(label)
                  }}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="docs-sidebar__footer">
            <a className="docs-footer__gh" href={repoUrl} target="_blank" rel="noreferrer">
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
            {activeLabel === 'Main Documentation' ? (
              <DocumentationSection
                section="fullreadme"
                githubHref={repoUrl}
                showTOC={showTOC}
                viewMode={viewMode}
                onContentLoaded={(content: string) => handleContentLoaded('fullreadme', content)}
                onContentChange={handleContentChange}
              />
            ) : activeLabel === 'Overview' ? (
              <DocumentationSection
                section="overview"
                githubHref={repoUrl}
                showTOC={showTOC}
                viewMode={viewMode}
                onContentLoaded={(content: string) => handleContentLoaded('overview', content)}
                onContentChange={handleContentChange}
              />
            ) : activeLabel === 'Quick Start' ? (
              <DocumentationSection
                section="quickstart"
                githubHref={repoUrl}
                showTOC={showTOC}
                viewMode={viewMode}
                onContentLoaded={(content: string) => handleContentLoaded('quickstart', content)}
                onContentChange={handleContentChange}
              />
            ) : activeLabel === 'Requirements' ? (
              <DocumentationSection
                section="requirements"
                githubHref={repoUrl}
                showTOC={showTOC}
                viewMode={viewMode}
                onContentLoaded={(content: string) => handleContentLoaded('requirements', content)}
                onContentChange={handleContentChange}
              />
            ) : (
              <div className="docs-welcome">
                <h2>Welcome to the Repository</h2>
                <p>Select a section from the sidebar to view the documentation.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomMiniDialog content={documentationContent} mode={viewMode} onModeChange={setViewMode} />

      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <SuggestionPanel isOpen={isSuggestionPanelOpen} onClose={() => setIsSuggestionPanelOpen(false)} />

      <ContextMenu
        isVisible={contextMenu.isVisible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={handleContextMenuClose}
        onUpload={handleUploadClick}
      />

      <FolderContextMenu
        isVisible={folderContextMenu.isVisible}
        x={folderContextMenu.x}
        y={folderContextMenu.y}
        onClose={handleFolderContextMenuClose}
        onNewNote={() => console.log('New note')}
        onNewFolder={() => console.log('New folder')}
        onRename={() => console.log('Rename')}
        onDelete={() => console.log('Delete')}
      />

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept="image/jpeg,image/jpg,image/png"
      />

      <ViewCodeDialog isOpen={isViewCodeDialogOpen} onClose={() => setIsViewCodeDialogOpen(false)} repoUrl={repoUrl} />
      <ShareDialog isOpen={isShareDialogOpen} onClose={() => setIsShareDialogOpen(false)} />
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        markdownContent=""
        documentationData={{}}
      />
    </div>
  )
}

export default DocumentationPage
