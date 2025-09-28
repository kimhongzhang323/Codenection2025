import React, { useState, useEffect } from 'react'
import Markdown from './markdown'
import TableOfContents from './ui/table_of_content'
import { documentationApi } from '../services/api'

interface DocumentationSectionProps {
  section: 'overview' | 'quickstart' | 'requirements' | 'fullreadme'
  githubHref: string
  showTOC: boolean
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
    section.toLowerCase().includes('🚀 overview') ||
    section.toLowerCase().includes('description')
  )
  
  if (overviewSection) {
    const sectionTitle = overviewSection.split('\n')[0]
    const sectionBody = overviewSection.split('\n').slice(1).join('\n')
    overviewContent += `## ${sectionTitle}\n\n${sectionBody}\n\n`
  }
  
  const featuresSection = sections.find(section => 
    section.toLowerCase().includes('key features') ||
    section.toLowerCase().includes('features') ||
    section.toLowerCase().includes('🎯 core features')
  )
  
  if (featuresSection) {
    const sectionTitle = featuresSection.split('\n')[0]
    const sectionBody = featuresSection.split('\n').slice(1).join('\n')
    overviewContent += `## ${sectionTitle}\n\n${sectionBody}\n\n`
  }
  
  const archSection = sections.find(section => 
    section.toLowerCase().includes('architecture') ||
    section.toLowerCase().includes('tech stack') ||
    section.toLowerCase().includes('🏗️ architecture')
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
    section.toLowerCase().includes('getting started') ||
    section.toLowerCase().includes('🚀 quick start')
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
    section.toLowerCase().includes('structure') ||
    section.toLowerCase().includes('📁 project structure')
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

    if (targetSection === 'overview') {
      if (readmeContent) {
        return extractOverviewFromReadme(readmeContent)
      }
      const overviewFile = apiResponse['frontend\\src\\pages\\docs\\overview.md'] || 
                           apiResponse['frontend/src/pages/docs/overview.md']
      if (overviewFile?.content) {
        return cleanContent(overviewFile.content)
      }
    } 
    
    else if (targetSection === 'quickstart') {
      if (readmeContent) {
        return extractQuickStartFromReadme(readmeContent)
      }
      const quickstartFile = apiResponse['frontend\\src\\pages\\docs\\quickstart.md'] || 
                             apiResponse['frontend/src/pages/docs/quickstart.md']
      if (quickstartFile?.content) {
        return cleanContent(quickstartFile.content)
      }
    } 
    
    else if (targetSection === 'requirements') {
      if (readmeContent) {
        return extractRequirementsFromReadme(readmeContent)
      }
      const requirementsFile = apiResponse['frontend\\src\\pages\\docs\\requirements.md'] || 
                               apiResponse['frontend/src/pages/docs/requirements.md']
      if (requirementsFile?.content) {
        return cleanContent(requirementsFile.content)
      }
    }
    
    else if (targetSection === 'fullreadme') {
      if (readmeContent) {
        const cleanedContent = cleanContent(readmeContent)
        // Ensure the content starts with an H1 header for button rendering
        if (!cleanedContent.trim().startsWith('#')) {
          return `# Full README\n\n${cleanedContent}`
        }
        return cleanedContent
      }
      
      // If no README.md, generate comprehensive documentation from all files
      const allContent: string[] = []
      
      Object.entries(apiResponse).forEach(([key, file]) => {
        if (file?.content) {
          const title = key.replace(/\.(md|txt)$/i, '').split(/[-_]/).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
          
          allContent.push(`## ${title}\n\n${cleanContent(file.content)}`)
        }
      })
      
      if (allContent.length > 0) {
        return allContent.join('\n\n---\n\n')
      }
    }
    
    return getSectionFallbackContent(targetSection)
  } catch (error) {
    console.error('Error parsing section content:', error)
    return getSectionFallbackContent(targetSection)
  }
}

const getSectionFallbackContent = (sectionName: string): string => {
  switch (sectionName) {
    case 'overview':
      return '# Project Overview\n\nWelcome to the project overview.\n\n## Description\n\nThis is a comprehensive documentation system.\n\n## Key Features\n\n- Interactive documentation\n- Code analysis\n- File tree navigation\n- Export functionality\n- AI-powered summaries'
    
    case 'quickstart':
      return '# Quick Start Guide\n\nGet up and running with the project quickly.\n\n## Prerequisites\n\n- Node.js (v16 or higher)\n- Java 11 or higher\n- Maven\n\n## Installation\n\n1. Clone the repository\n2. Install dependencies\n3. Configure environment\n4. Run the application'
    
    case 'requirements':
      return '# System Requirements\n\nSystem requirements and dependencies for the project.\n\n## Software Requirements\n\n- Node.js v16+\n- Java 11+\n- Maven 3.6+\n\n## Hardware Requirements\n\n- Minimum 4GB RAM\n- 2GB available disk space'
    
    case 'fullreadme':
      return '# Full Documentation\n\nComplete documentation and README content.\n\n## Project Overview\n\nThis is the main documentation for the project.\n\n## Getting Started\n\nTo get started with this project, please refer to the installation and setup instructions.\n\n## Features\n\n- Comprehensive documentation system\n- Interactive file exploration\n- Code analysis and visualization\n- Export functionality'
    
    default:
      return `# ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}\n\nContent for this section is being prepared.`
  }
}

const DocumentationSection: React.FC<DocumentationSectionProps> = ({ 
  section, 
  githubHref, 
  showTOC 
}) => {
  const [content, setContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Reset content immediately when section changes
    setContent('')
    setIsLoading(true)

    const loadSectionContent = async () => {
      try {
        console.log(`[DocumentationSection] Loading ${section} content from:`, githubHref)
        const docs = await documentationApi.getAll(githubHref)
        console.log(`[DocumentationSection] API response for ${section}:`, docs)
        const parsedContent = parseSectionFromApiResponse(docs, section)
        console.log(`[DocumentationSection] Parsed content for ${section}:`, parsedContent.substring(0, 200) + '...')
        setContent(parsedContent)
      } catch (error) {
        console.error(`Error loading ${section} content:`, error)
        setContent(getSectionFallbackContent(section))
      } finally {
        setIsLoading(false)
      }
    }

    if (githubHref && githubHref !== '#') {
      // Add a small delay to ensure the loading state is visible
      const timeoutId = setTimeout(() => {
        loadSectionContent()
      }, 50)
      
      return () => clearTimeout(timeoutId)
    } else {
      setContent(getSectionFallbackContent(section))
      setIsLoading(false)
    }
  }, [section, githubHref])

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

  return (
    <div className="documentation-section">
      <Markdown content={content} />
      {showTOC && <TableOfContents content={content} />}
    </div>
  )
}

export default DocumentationSection
