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

    // Create a visual SVG representation for PlantUML-style diagrams
    const renderPlantUMLDiagram = (plantUMLCode: string) => {
      const container = containerRef.current
      if (!container) return

      // Create SVG container
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('width', '100%')
      svg.setAttribute('height', '500')
      svg.setAttribute('viewBox', '0 0 800 500')
      svg.style.background = 'var(--docs-bg)'
      svg.style.border = '1px solid var(--sidebar-border)'
      svg.style.borderRadius = '8px'

      // Parse PlantUML code and create visual elements
      const lines = plantUMLCode.split('\n').filter(line => line.trim())
      const elements: Array<{
        id: string
        label: string
        type: 'component' | 'actor' | 'database'
        x?: number
        y?: number
      }> = []
      const connections: Array<{
        from: string
        to: string
      }> = []
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('@startuml') || trimmed.startsWith('@enduml') || 
            trimmed.startsWith('!theme') || trimmed.startsWith('skinparam')) {
          continue
        }
        
        // Parse components
        if (trimmed.startsWith('component') || trimmed.startsWith('actor') || 
            trimmed.startsWith('database')) {
          const match = trimmed.match(/(?:component|actor|database)\s+"([^"]+)"\s+as\s+(\w+)/)
          if (match) {
            elements.push({
              id: match[2],
              label: match[1],
              type: trimmed.startsWith('component') ? 'component' : 
                    trimmed.startsWith('actor') ? 'actor' : 'database'
            })
          }
        }
        
        // Parse connections
        if (trimmed.includes('-->')) {
          const parts = trimmed.split('-->')
          if (parts.length === 2) {
            connections.push({
              from: parts[0].trim(),
              to: parts[1].trim()
            })
          }
        }
      }

      // Position elements in a grid layout
      const cols = Math.ceil(Math.sqrt(elements.length))
      const spacing = { x: 150, y: 100 }
      const startPos = { x: 100, y: 50 }
      
      elements.forEach((element, index) => {
        const col = index % cols
        const row = Math.floor(index / cols)
        const x = startPos.x + col * spacing.x
        const y = startPos.y + row * spacing.y
        
        element.x = x
        element.y = y
        
        // Create visual element based on type
        let shape: SVGElement
        
        if (element.type === 'actor') {
          // Create actor (stick figure)
          const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
          
          // Head
          const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          head.setAttribute('cx', x.toString())
          head.setAttribute('cy', (y - 10).toString())
          head.setAttribute('r', '8')
          head.setAttribute('fill', 'none')
          head.setAttribute('stroke', 'var(--docs-text)')
          head.setAttribute('stroke-width', '2')
          group.appendChild(head)
          
          // Body
          const body = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          body.setAttribute('x1', x.toString())
          body.setAttribute('y1', (y - 2).toString())
          body.setAttribute('x2', x.toString())
          body.setAttribute('y2', (y + 20).toString())
          body.setAttribute('stroke', 'var(--docs-text)')
          body.setAttribute('stroke-width', '2')
          group.appendChild(body)
          
          shape = group
        } else if (element.type === 'database') {
          // Create database shape
          const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
          
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          rect.setAttribute('x', (x - 40).toString())
          rect.setAttribute('y', (y - 15).toString())
          rect.setAttribute('width', '80')
          rect.setAttribute('height', '30')
          rect.setAttribute('fill', '#e1f5fe')
          rect.setAttribute('stroke', '#0288d1')
          rect.setAttribute('stroke-width', '2')
          rect.setAttribute('rx', '5')
          group.appendChild(rect)
          
          shape = group
        } else {
          // Create component (rectangle)
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          rect.setAttribute('x', (x - 50).toString())
          rect.setAttribute('y', (y - 15).toString())
          rect.setAttribute('width', '100')
          rect.setAttribute('height', '30')
          rect.setAttribute('fill', '#f3e5f5')
          rect.setAttribute('stroke', '#7b1fa2')
          rect.setAttribute('stroke-width', '2')
          rect.setAttribute('rx', '5')
          shape = rect
        }
        
        svg.appendChild(shape)
        
        // Add label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', x.toString())
        text.setAttribute('y', (y + 5).toString())
        text.setAttribute('text-anchor', 'middle')
        text.setAttribute('font-family', 'Arial, sans-serif')
        text.setAttribute('font-size', '11')
        text.setAttribute('fill', 'var(--docs-text)')
        text.textContent = element.label.length > 12 ? element.label.substring(0, 12) + '...' : element.label
        svg.appendChild(text)
      })
      
      // Draw connections
      connections.forEach(connection => {
        const fromElement = elements.find(e => e.id === connection.from)
        const toElement = elements.find(e => e.id === connection.to)
        
        if (fromElement && toElement && fromElement.x !== undefined && fromElement.y !== undefined && 
            toElement.x !== undefined && toElement.y !== undefined) {
          // Create arrow line
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          line.setAttribute('x1', fromElement.x.toString())
          line.setAttribute('y1', fromElement.y.toString())
          line.setAttribute('x2', toElement.x.toString())
          line.setAttribute('y2', toElement.y.toString())
          line.setAttribute('stroke', 'var(--docs-text)')
          line.setAttribute('stroke-width', '2')
          line.setAttribute('marker-end', 'url(#arrowhead)')
          svg.appendChild(line)
        }
      })
      
      // Add arrow marker definition
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
      marker.setAttribute('id', 'arrowhead')
      marker.setAttribute('markerWidth', '10')
      marker.setAttribute('markerHeight', '7')
      marker.setAttribute('refX', '9')
      marker.setAttribute('refY', '3.5')
      marker.setAttribute('orient', 'auto')
      
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
      polygon.setAttribute('points', '0 0, 10 3.5, 0 7')
      polygon.setAttribute('fill', 'var(--docs-text)')
      marker.appendChild(polygon)
      defs.appendChild(marker)
      svg.appendChild(defs)
      
      container.appendChild(svg)
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
