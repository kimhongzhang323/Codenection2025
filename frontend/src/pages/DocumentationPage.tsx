import { useEffect, useRef, useState } from 'react'
import './DocumentationPage.css'
import { GithubIcon } from '../components/github_icon'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { SunIcon } from '../components/light_icon'
import { MoonIcon } from '../components/dark_icon'
import Markdown from '../components/markdown'
import { AnimatedThemeToggler } from '../components/theme'

type DocItem =
  | { type: 'separator'; label: string }
  | { type: 'file'; label: string; href?: string }
  | { type: 'folder'; label: string; children: DocItem[] }

// Load all markdown files under docs once; reuse for routing and content loading
const MD_MODULES = import.meta.glob('./docs/*.md', { as: 'raw' }) as Record<string, () => Promise<string>>

function Collapsible({ label, children, defaultOpen = false }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<string>(defaultOpen ? 'none' : '0px')

  useEffect(() => {
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
      requestAnimationFrame(() => setMaxHeight('0px'))
    }
  }, [open])

  return (
    <div className="docs-folder">
      <button className={`docs-folder__button ${open ? 'is-open' : ''}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>{label}</span>
        <span className="docs-folder__chevron" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </button>
      <div
        ref={contentRef}
        className="docs-folder__children"
        style={{ maxHeight, overflow: 'hidden' }}
        aria-hidden={!open}
      >
        {children}
      </div>
    </div>
  )
}

const MOCK_TREE: DocItem[] = [
  { type: 'separator', label: 'Introduction' },
  { type: 'file', label: 'Overview' },
  { type: 'file', label: 'Quick Start' },
  { type: 'separator', label: 'Setup' },
  {
    type: 'folder',
    label: 'Installation',
    children: [
      { type: 'file', label: 'Requirements' },
      { type: 'file', label: 'Using Vite' },
      { type: 'file', label: 'Using Next.js' },
    ],
  },
  {
    type: 'folder',
    label: 'Configuration',
    children: [
      { type: 'file', label: 'Project Structure' },
      { type: 'file', label: 'Environments' },
    ],
  },
  { type: 'separator', label: 'Writing' },
  {
    type: 'folder',
    label: 'Content',
    children: [
      { type: 'file', label: 'Markdown' },
      { type: 'file', label: 'Components' },
      { type: 'file', label: 'Navigation' },
    ],
  },
  { type: 'separator', label: 'Reference' },
  { type: 'file', label: 'API' },
  { type: 'file', label: 'CLI' },
  { type: 'file', label: 'Multiagent' },
  { type: 'file', label: 'Class' },
  { type: 'file', label: 'Versioning' },
  { type: 'file', label: 'UI Layout' },
]

function slugify(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

function basenameFromPath(path: string) {
  const m = path.match(/\/docs\/([^/]+)\.md$/)
  return m ? m[1] : null
}

function normalizeKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function renderItem(item: DocItem, idx: number, onFileClick: (label: string) => void, activeLabel: string | null) {
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
      >
        {item.label}
      </button>
    )
  }
  // folder
  return (
    <Collapsible key={`folder-${idx}`} label={item.label} defaultOpen={false}>
      {item.children.map((child, i) => (
        <div key={`child-${idx}-${i}`}>{renderItem(child, i, onFileClick, activeLabel)}</div>
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
  const [isScrolling, setIsScrolling] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })
  const scrollTimeoutRef = useRef<number | null>(null)
  const treeRef = useRef<HTMLElement>(null)

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
      } catch {}
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
    // Prefer matching actual filenames over slug to support quickstart.md vs "Quick Start"
    let next = isOverview ? 'overview' : slugify(label)
    const basenames = Object.keys(MD_MODULES).map(basenameFromPath).filter(Boolean) as string[]
    const normalizedLabel = normalizeKey(label)
    const matched = basenames.find((b) => normalizeKey(b) === normalizedLabel)
    if (matched) next = matched
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
      // find matching label in tree
      const collectLabels = (items: DocItem[], acc: string[] = []): string[] => {
        for (const it of items) {
          if (it.type === 'file') acc.push(it.label)
          if (it.type === 'folder') collectLabels(it.children, acc)
        }
        return acc
      }
      const allLabels = collectLabels(MOCK_TREE)
      const matched = allLabels.find((l) => slugify(l) === targetSlug)
      setActiveLabel(matched || 'Overview')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoSlug])

  // Load markdown file content for current slug; UI can render later
  useEffect(() => {
    const pathname = window.location.pathname.replace(/\/+$/, '')
    const parts = pathname.split('/').filter(Boolean)
    const filePart = parts[1] || 'overview'
    const basenames = Object.keys(MD_MODULES).map(basenameFromPath).filter(Boolean) as string[]
    // Try exact, then normalized (to handle quick-start vs quickstart)
    let targetBase = filePart
    if (!basenames.includes(targetBase)) {
      const normalized = normalizeKey(filePart)
      const alt = basenames.find((b) => normalizeKey(b) === normalized)
      if (alt) targetBase = alt
    }
    const key = Object.keys(MD_MODULES).find((k) => k.endsWith(`/docs/${targetBase}.md`))
    if (key) {
      MD_MODULES[key]().then((raw) => setMarkdownContent(raw)).catch(() => setMarkdownContent(''))
    } else {
      setMarkdownContent('')
    }
  }, [activeLabel])

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

  const handleSidebarToggle = () => {
    const newState = !isSidebarCollapsed
    setIsSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState))
  }

  // Handle theme changes and persist to localStorage
  const handleThemeToggle = (isDark: boolean) => {
    setIsDarkSelected(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  // Sync document class with theme state
  useEffect(() => {
    if (isDarkSelected) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkSelected])

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
      <div className={`docs-layout ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
        <aside className={`docs-sidebar ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
          <div className="docs-sidebar__header">
            <div className="docs-sidebar__title">
              <div className="docs-sidebar__title-left">
                <img src="/logo.png" alt="Logo" className="docs-sidebar__logo" />
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
            <div className="docs-sidebar__search">
              <svg className="docs-sidebar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Search" aria-label="Search docs" />
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
              {MOCK_TREE.map((it, i) => renderItem(it, i, handleFileClick, activeLabel))}
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
            <Markdown content={markdownContent} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DocumentationPage
