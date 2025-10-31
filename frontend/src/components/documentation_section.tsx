import React, { useState, useEffect } from 'react'
import Markdown from './markdown'
import TableOfContents from './ui/table_of_content'
import MarkdownEditor from './ui/markdown_editor'
import { documentationApi } from '../services/api'

interface DocumentationSectionProps {
  section: 'overview' | 'quickstart' | 'requirements' | 'fullreadme'
  githubHref: string
  showTOC: boolean
  viewMode?: 'reading' | 'edit'
  onContentLoaded?: (content: string, metadata?: Record<string, unknown>) => void
  onContentChange?: (content: string) => void
}

interface ApiDocFile {
  content: string
  lastUpdated?: string
}

interface ApiResponse {
  [key: string]: ApiDocFile
}

const cleanContent = (content: string): string => {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

const extractOverviewFromReadme = (readmeContent: string): string => {
  const cleanReadme = cleanContent(readmeContent)
  const sections = cleanReadme.split(/^## /m)
  
  let overviewContent = '# Project Overview\n\n'
  
  const overviewSection = sections.find(section => 
    section.toLowerCase().includes('overview') || 
    section.toLowerCase().includes('description')
  )
  
  if (overviewSection) {
    const sectionTitle = overviewSection.split('\n')[0]
    const sectionBody = overviewSection.split('\n').slice(1).join('\n')
    overviewContent += `## ${sectionTitle}\n\n${sectionBody}\n\n`
  }
  
  const featuresSection = sections.find(section => 
    section.toLowerCase().includes('key features') ||
    section.toLowerCase().includes('features')
  )
  
  if (featuresSection) {
    const sectionTitle = featuresSection.split('\n')[0]
    const sectionBody = featuresSection.split('\n').slice(1).join('\n')
    overviewContent += `## ${sectionTitle}\n\n${sectionBody}\n\n`
  }
  
  const archSection = sections.find(section => 
    section.toLowerCase().includes('architecture') ||
    section.toLowerCase().includes('tech stack')
  )
  
  if (archSection) {
    const sectionTitle = archSection.split('\n')[0]
    const sectionBody = archSection.split('\n').slice(1).join('\n')
    overviewContent += `## ${sectionTitle}\n\n${sectionBody}\n\n`
  }
  
  return overviewContent
}

const extractQuickStartFromReadme = (readmeContent: string): string => {
  const cleanReadme = cleanContent(readmeContent)
  const sections = cleanReadme.split(/^## /m)
  
  let quickStartContent = '# Quick Start Guide\n\n'
  
  const quickStartSection = sections.find(section => 
    section.toLowerCase().includes('quick start') ||
    section.toLowerCase().includes('getting started')
  )
  
  if (quickStartSection) {
    const sectionTitle = quickStartSection.split('\n')[0]
    const sectionBody = quickStartSection.split('\n').slice(1).join('\n')
    quickStartContent += `## ${sectionTitle}\n\n${sectionBody}\n\n`
  }
  
  const prereqSection = sections.find(section => 
    section.toLowerCase().includes('prerequisites') ||
    section.toLowerCase().includes('requirements')
  )
  
  if (prereqSection) {
    const sectionTitle = prereqSection.split('\n')[0]
    const sectionBody = prereqSection.split('\n').slice(1).join('\n')
    quickStartContent += `## ${sectionTitle}\n\n${sectionBody}\n\n`
  }
  
  const envSection = sections.find(section => 
    section.toLowerCase().includes('environment') ||
    section.toLowerCase().includes('configuration')
  )
  
  if (envSection) {
    const sectionTitle = envSection.split('\n')[0]
    const sectionBody = envSection.split('\n').slice(1).join('\n')
    quickStartContent += `## ${sectionTitle}\n\n${sectionBody}\n\n`
  }
  
  return quickStartContent
}

const extractRequirementsFromReadme = (readmeContent: string): string => {
  const cleanReadme = cleanContent(readmeContent)
  const sections = cleanReadme.split(/^## /m)
  
  let requirementsContent = '# System Requirements\n\n'
  
  const prereqSection = sections.find(section => 
    section.toLowerCase().includes('prerequisites') ||
    section.toLowerCase().includes('requirements')
  )
  
  if (prereqSection) {
    const sectionTitle = prereqSection.split('\n')[0]
    const sectionBody = prereqSection.split('\n').slice(1).join('\n')
    requirementsContent += `## ${sectionTitle}\n\n${sectionBody}\n\n`
  }
  
  const techSection = sections.find(section => 
    section.toLowerCase().includes('tech stack') ||
    section.toLowerCase().includes('technology') ||
    section.toLowerCase().includes('dependencies')
  )
  
  if (techSection) {
    const sectionBody = techSection.split('\n').slice(1).join('\n')
    requirementsContent += `## Technology Stack\n\n${sectionBody}\n\n`
  }
  
  const structureSection = sections.find(section => 
    section.toLowerCase().includes('project structure') ||
    section.toLowerCase().includes('structure')
  )
  
  if (structureSection) {
    const sectionTitle = structureSection.split('\n')[0]
    const sectionBody = structureSection.split('\n').slice(1).join('\n')
    requirementsContent += `## ${sectionTitle}\n\n${sectionBody}\n\n`
  }
  
  return requirementsContent
}

const parseSectionFromApiResponse = (apiResponse: ApiResponse, targetSection: string): string => {
  try {
    const readmeFile = apiResponse['README.md']
    const readmeContent = readmeFile?.content || ''

    if (targetSection === 'overview' && readmeContent) {
      return extractOverviewFromReadme(readmeContent)
    } 
    if (targetSection === 'quickstart' && readmeContent) {
      return extractQuickStartFromReadme(readmeContent)
    } 
    if (targetSection === 'requirements' && readmeContent) {
      return extractRequirementsFromReadme(readmeContent)
    } 
    if (targetSection === 'fullreadme' && readmeContent) {
      const cleanedContent = cleanContent(readmeContent)
      return cleanedContent.trim().startsWith('#')
        ? cleanedContent
        : `# Full README\n\n${cleanedContent}`
    }

    // Try specific markdown file locations
    const possiblePaths = [
      `frontend\\src\\pages\\docs\\${targetSection}.md`,
      `frontend/src/pages/docs/${targetSection}.md`,
      `${targetSection}.md`
    ]

    for (const path of possiblePaths) {
      const file = apiResponse[path]
      if (file?.content) return cleanContent(file.content)
    }

    return ''
  } catch (error) {
    console.error('Error parsing section content:', error)
    return ''
  }
}

const DocumentationSection: React.FC<DocumentationSectionProps> = ({ 
  section, 
  githubHref, 
  showTOC,
  viewMode = 'reading',
  onContentLoaded,
  onContentChange 
}) => {
  const [content, setContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [editedContent, setEditedContent] = useState<string>('')

  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent)
    onContentChange?.(newContent)
  }

  useEffect(() => {
    setContent('')
    setIsLoading(true)

    const loadSectionContent = async () => {
      try {
        console.log(`[DocumentationSection] Loading ${section} content from:`, githubHref)
        const docs = await documentationApi.getAll(githubHref)
        const parsedContent = parseSectionFromApiResponse(docs, section)
        setContent(parsedContent)
        setEditedContent(parsedContent)
        onContentLoaded?.(parsedContent)
      } catch (error) {
        console.error(`Error loading ${section} content:`, error)
        setContent('')
        setEditedContent('')
        onContentLoaded?.('')
      } finally {
        setIsLoading(false)
      }
    }

    if (githubHref && githubHref !== '#') {
      const timeoutId = setTimeout(() => loadSectionContent(), 50)
      return () => clearTimeout(timeoutId)
    } else {
      setContent('')
      setEditedContent('')
      onContentLoaded?.('')
      setIsLoading(false)
    }
  }, [section, githubHref, onContentLoaded])

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '200px',
        color: 'var(--docs-normal-text)' 
      }}>
        <div>
          <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
          <p>Loading {section} documentation...</p>
        </div>
      </div>
    )
  }

  if (!content.trim()) {
    return (
      <div style={{
        textAlign: 'center',
        color: 'var(--docs-normal-text)',
        padding: '2rem'
      }}>
        <p>No documentation available for this section.</p>
      </div>
    )
  }

  return (
    <div className="documentation-section">
      {viewMode === 'edit' ? (
        <MarkdownEditor
          content={editedContent}
          onContentChange={handleContentChange}
          placeholder={`Edit ${section} documentation...`}
        />
      ) : (
        <Markdown content={content} />
      )}
      {showTOC && viewMode !== 'edit' && <TableOfContents content={content} />}
    </div>
  )
}

export default DocumentationSection
