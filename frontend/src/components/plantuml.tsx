import React, { useEffect, useRef } from 'react'

interface PlantUMLProps {
  code: string
  className?: string
}

const PlantUML: React.FC<PlantUMLProps> = ({ code, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !code) return

    // Clean the container
    containerRef.current.innerHTML = ''

    // Create a simple SVG representation for PlantUML-style diagrams
    // This is a basic implementation - for production, you'd want to use a proper PlantUML renderer
    const renderPlantUMLDiagram = (plantUMLCode: string) => {
      const container = containerRef.current
      if (!container) return

      // For now, we'll create a simple text representation
      // In production, you'd use a PlantUML server or library
      const pre = document.createElement('pre')
      pre.style.cssText = `
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        padding: 1rem;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
        overflow-x: auto;
        white-space: pre-wrap;
        color: #495057;
      `
      
      // Simple PlantUML-style ASCII art rendering
      const lines = plantUMLCode.split('\n').filter(line => line.trim())
      let asciiArt = ''
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('@startuml') || trimmed.startsWith('@enduml')) {
          continue
        }
        
        if (trimmed.includes('->')) {
          // Render arrows
          const parts = trimmed.split('->')
          if (parts.length === 2) {
            const from = parts[0].trim()
            const to = parts[1].trim()
            asciiArt += `┌─────────────┐    ┌─────────────┐\n`
            asciiArt += `│ ${from.padEnd(11)} │───▶│ ${to.padEnd(11)} │\n`
            asciiArt += `└─────────────┘    └─────────────┘\n\n`
          }
        } else if (trimmed.includes(':')) {
          // Render components
          const [component, description] = trimmed.split(':')
          asciiArt += `┌─────────────────────────┐\n`
          asciiArt += `│ ${component.trim().padEnd(23)} │\n`
          if (description) {
            asciiArt += `│ ${description.trim().padEnd(23)} │\n`
          }
          asciiArt += `└─────────────────────────┘\n\n`
        } else if (trimmed) {
          asciiArt += `${trimmed}\n`
        }
      }
      
      pre.textContent = asciiArt || plantUMLCode
      container.appendChild(pre)
    }

    renderPlantUMLDiagram(code)
  }, [code])

  return (
    <div 
      ref={containerRef} 
      className={`plantuml-container ${className}`}
      style={{ 
        width: '100%', 
        minHeight: '200px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '1rem'
      }}
    />
  )
}

export default PlantUML
