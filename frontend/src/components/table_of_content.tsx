import { useEffect, useState, useRef } from 'react'

interface TocItem {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  content: string
  className?: string
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ content, className = '' }) => {
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const isScrollingRef = useRef(false)

  // Extract headings from markdown content
  useEffect(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    const items: TocItem[] = []
    let match

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length
      const text = match[2].trim()
      
      // Skip H1 headers (level 1)
      if (level === 1) continue
      
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      
      items.push({ id, text, level })
    }

    setTocItems(items)
  }, [content])

  // Set up intersection observer for active section highlighting
  useEffect(() => {
    if (tocItems.length === 0) return

    const headingElements = tocItems
      .map(item => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[]

    if (headingElements.length === 0) return

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Don't update active ID if we're currently scrolling programmatically
        if (isScrollingRef.current) return

        const visibleEntries = entries.filter(entry => entry.isIntersecting)
        
        if (visibleEntries.length > 0) {
          // Sort by intersection ratio and position, prefer the one most in view
          const topEntry = visibleEntries.sort((a, b) => {
            if (a.intersectionRatio !== b.intersectionRatio) {
              return b.intersectionRatio - a.intersectionRatio
            }
            return a.boundingClientRect.top - b.boundingClientRect.top
          })[0]
          
          setActiveId(topEntry.target.id)
        }
      },
      {
        rootMargin: '-20% 0px -35% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    )

    headingElements.forEach(el => {
      observerRef.current?.observe(el)
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [tocItems])

  const handleTocClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      isScrollingRef.current = true
      
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start'
      })
      
      setActiveId(id)
      
      // Reset the scrolling flag after the scroll animation completes
      setTimeout(() => {
        isScrollingRef.current = false
      }, 1000)
    }
  }

  if (tocItems.length === 0) {
    return null
  }

  return (
    <div className={`toc-container ${className}`}>
      <div className="toc-header">
        <div className="toc-hamburger">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </div>
        <h3>On this page</h3>
      </div>
      <nav className="toc-nav">
        <div className="toc-line"></div>
        {tocItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTocClick(item.id)}
            className={`toc-item toc-level-${item.level} ${
              activeId === item.id ? 'toc-active' : ''
            }`}
            title={item.text}
            style={{
              paddingLeft: `${(item.level - 1) * 16 + 24}px`
            }}
          >
            {item.text}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default TableOfContents
