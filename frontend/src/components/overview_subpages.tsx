import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Markdown from '../components/markdown'
import EmbeddedChangelog from './embedded_changelog'
import EmbeddedFlowchart from './embedded_flowchart'
import './overview_subpages.css'

interface OverviewSubpagesProps {
  content: string
  className?: string
  repoUrl?: string
  initialSubpage?: string
}

interface SubPage {
  id: string
  title: string
  content: string
  wordCount: number
  type: 'markdown' | 'changelog' | 'flowchart'
}

const OverviewSubpages: React.FC<OverviewSubpagesProps> = ({ content, className = '', repoUrl, initialSubpage }) => {
  const navigate = useNavigate()
  const { repo, subpage } = useParams<{ repo: string; subpage?: string }>()
  const location = useLocation()
  const [activeSubpage, setActiveSubpage] = useState<string>(initialSubpage || 'changelog')

  // Parse content into subpages based on H2 headers
  const subpages = useMemo(() => {
    const pages: SubPage[] = []
    const lines = content.split('\n')
    let currentPage: SubPage | null = null
    let currentContent: string[] = []

    // Only parse markdown if there's content
    if (content && content.trim().length > 0) {
      // Always start with an introduction page
      let hasIntroContent = false

      for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if this is an H2 header (## Title)
      if (line.trim().match(/^##\s+(.+)$/)) {
        // Save the previous page if it exists
        if (currentPage && currentContent.length > 0) {
          currentPage.content = currentContent.join('\n').trim()
          currentPage.wordCount = currentPage.content.split(/\s+/).filter(w => w.length > 0).length
          pages.push(currentPage)
        }

        // Create a new page
        const title = line.trim().replace(/^##\s+/, '')
        const id = title.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'section'

        currentPage = {
          id,
          title,
          content: '',
          wordCount: 0,
          type: 'markdown'
        }
        currentContent = [line] // Include the header in the content
      } else {
        // Add line to current content
        if (!currentPage && !hasIntroContent && line.trim().length > 0) {
          // This is content before the first H2, create introduction page
          currentPage = {
            id: 'introduction',
            title: 'Introduction',
            content: '',
            wordCount: 0,
            type: 'markdown'
          }
          hasIntroContent = true
        }
        
        if (currentPage) {
          currentContent.push(line)
        }
      }
    }

      // Save the last page
      if (currentPage && currentContent.length > 0) {
        currentPage.content = currentContent.join('\n').trim()
        currentPage.wordCount = currentPage.content.split(/\s+/).filter(w => w.length > 0).length
        pages.push(currentPage)
      }
    }

    // Add changelog and flowchart as primary subpages (at the beginning)
    const specialPages = [
      {
        id: 'changelog',
        title: 'Changelog',
        content: '', // Changelog content will be loaded dynamically
        wordCount: 0,
        type: 'changelog' as const
      },
      {
        id: 'flowchart',
        title: 'System Diagrams',
        content: '', // Flowchart content will be loaded dynamically
        wordCount: 0,
        type: 'flowchart' as const
      }
    ]

    // Put special pages first, then documentation pages
    return [...specialPages, ...pages]
  }, [content])

  // Update active subpage based on URL or initial prop
  useEffect(() => {
    console.log('OverviewSubpages - URL change detected:', { 
      subpage, 
      initialSubpage, 
      activeSubpage,
      availableSubpages: subpages.map(p => p.id)
    })
    
    if (subpage && subpages.find(p => p.id === subpage)) {
      console.log('Setting active subpage from URL:', subpage)
      setActiveSubpage(subpage)
    } else if (initialSubpage && subpages.find(p => p.id === initialSubpage)) {
      console.log('Setting active subpage from initial prop:', initialSubpage)
      setActiveSubpage(initialSubpage)
    } else {
      // Default to changelog instead of markdown content
      console.log('Setting default active subpage to changelog')
      setActiveSubpage('changelog')
    }
  }, [subpage, initialSubpage, subpages, activeSubpage])

  // Handle subpage navigation
  const handleSubpageClick = (subpageId: string) => {
    setActiveSubpage(subpageId)
    navigate(`/${repo}/overview/${subpageId}`, { 
      replace: true, 
      state: location.state 
    })
  }

  // Get current subpage content
  const currentSubpage = subpages.find(p => p.id === activeSubpage) || subpages[0]
  const currentIndex = subpages.findIndex(p => p.id === activeSubpage)
  
  // If activeSubpage is not found, sync with the first available subpage
  if (currentIndex === -1 && subpages.length > 0 && activeSubpage !== subpages[0].id) {
    console.log('Active subpage not found, syncing to first subpage:', subpages[0].id)
    setActiveSubpage(subpages[0].id)
  }
  
  // Debug current subpage
  console.log('Current rendering state:', {
    activeSubpage,
    currentSubpageFound: !!currentSubpage,
    currentSubpageType: currentSubpage?.type,
    currentSubpageTitle: currentSubpage?.title
  })



  // If there's only one subpage and it's small, show all content
  if (subpages.length === 1 && subpages[0].wordCount < 500) {
    return (
      <div className={`overview-content ${className}`}>
        <Markdown content={content} />
      </div>
    )
  }

  // If there are no subpages, show empty state
  if (subpages.length === 0) {
    return (
      <div className={`overview-content ${className}`}>
        <div className="overview-empty">
          <h2>Overview</h2>
          <p>No content available for overview.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`overview-subpages ${className}`}>
      {/* Clean Subpage Navigation */}
      <div className="subpage-nav">
        <div className="subpage-list">
          {subpages.map((page) => (
            <button
              key={page.id}
              className={`subpage-item ${activeSubpage === page.id ? 'active' : ''}`}
              onClick={() => handleSubpageClick(page.id)}
            >
              <div className="subpage-title">{page.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="subpage-content">
        {currentSubpage && (
          <>
            <div className="subpage-body">
              {currentSubpage.type === 'changelog' ? (
                <EmbeddedChangelog 
                  repo={repo} 
                  repoUrl={repoUrl}
                  className="changelog-in-overview"
                />
              ) : currentSubpage.type === 'flowchart' ? (
                <EmbeddedFlowchart 
                  className="flowchart-in-overview"
                />
              ) : (
                <Markdown content={currentSubpage.content} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default OverviewSubpages
