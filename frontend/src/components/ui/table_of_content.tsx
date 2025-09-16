import { useEffect, useState } from 'react'

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

  const handleTocClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start'
      })
    }
  }

  if (tocItems.length === 0) {
    return null
  }

  return (
    <div className={`toc-container ${className}`}>
      <div className="toc-header">
        <div className="toc-hamburger">
          <img src="/toc.svg" alt="Table of Contents" width="16" height="16" />
        </div>
        <h3>On this page</h3>
      </div>
      <nav className="toc-nav">
        {tocItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTocClick(item.id)}
            className={`toc-item toc-level-${item.level}`}
            title={item.text}
            style={{
              paddingLeft: `${(item.level - 2) * 12 + 16}px`
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
