import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Mermaid from '../components/mermaid'
import './flowchart_page.css'

interface FlowchartPageProps {
  className?: string
}

const FlowchartPage: React.FC<FlowchartPageProps> = ({ className = '' }) => {
  const location = useLocation() as { state?: { repoUrl?: string; repoData?: { name?: string; fullName?: string } } }
  const navigate = useNavigate()
  const [selectedDiagram, setSelectedDiagram] = useState<string>('system-overview')
  
  const repoName = location.state?.repoData?.name || location.state?.repoData?.fullName?.split('/')[1] || 'Repository'

  // Sample system diagrams - you can modify these based on your actual system architecture
  const diagrams = {
    'system-overview': {
      title: 'System Overview',
      type: 'mermaid',
      content: `
graph TB
    A[User] --> B[Frontend React App]
    B --> C[API Gateway]
    C --> D[Authentication Service]
    C --> E[Documentation Service]
    C --> F[Repository Service]
    E --> G[GitHub API]
    F --> G
    D --> H[User Database]
    E --> I[Documentation Storage]
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#ffebee
    style H fill:#f1f8e9
    style I fill:#f1f8e9
      `
    },
    'data-flow': {
      title: 'Data Flow Diagram',
      type: 'mermaid',
      content: `
graph LR
    A[User Request] --> B[Frontend]
    B --> C[Authentication Check]
    C --> D{Authenticated?}
    D -->|Yes| E[API Request]
    D -->|No| F[Login Page]
    E --> G[Backend Processing]
    G --> H[Database Query]
    G --> I[GitHub API Call]
    H --> J[Response Data]
    I --> J
    J --> K[Frontend Update]
    K --> L[User Interface]
    
    style D fill:#ffecb3
    style F fill:#ffcdd2
    style L fill:#c8e6c9
      `
    },
    'component-architecture': {
      title: 'Component Architecture',
      type: 'mermaid',
      content: `
graph TB
    subgraph "Frontend Layer"
        A[App Component]
        B[Documentation Page]
        C[Changelog Page]
        D[Flowchart Page]
        E[Authentication Components]
    end
    
    subgraph "Service Layer"
        F[API Service]
        G[GitHub Service]
        H[Auth Service]
    end
    
    subgraph "Backend Layer"
        I[Spring Boot API]
        J[Database]
        K[External APIs]
    end
    
    A --> B
    A --> C
    A --> D
    A --> E
    B --> F
    C --> G
    D --> F
    E --> H
    F --> I
    G --> K
    H --> I
    I --> J
    
    style A fill:#e3f2fd
    style I fill:#e8f5e8
    style J fill:#fff3e0
      `
    },
    'user-journey': {
      title: 'User Journey Flow',
      type: 'mermaid',
      content: `
graph TD
    A[User Visits Site] --> B{First Time?}
    B -->|Yes| C[Registration]
    B -->|No| D[Login]
    C --> E[Account Created]
    D --> F{Credentials Valid?}
    F -->|Yes| G[Dashboard]
    F -->|No| H[Error Message]
    E --> G
    H --> D
    G --> I[Browse Repositories]
    I --> J[Select Repository]
    J --> K[View Documentation]
    K --> L[Navigate Sections]
    L --> M[View Changelog]
    L --> N[View Flowcharts]
    M --> O[Browse Commits]
    N --> P[Analyze Architecture]
    
    style C fill:#c8e6c9
    style G fill:#e1f5fe
    style H fill:#ffcdd2
    style K fill:#f3e5f5
      `
    }
  }

  const currentDiagram = diagrams[selectedDiagram as keyof typeof diagrams]

  return (
    <div className={`flowchart-page ${className}`}>
      <div className="flowchart-header">
        <div className="flowchart-title">
          <h1>System Architecture & Flow Diagrams</h1>
          <p className="flowchart-subtitle">Interactive system diagrams for {repoName}</p>
        </div>
        
        <div className="flowchart-actions">
          <button 
            className="back-button"
            onClick={() => navigate(-1)}
          >
            ← Back to Documentation
          </button>
        </div>
      </div>

      <div className="flowchart-content">
        <div className="diagram-selector">
          <h3>Available Diagrams</h3>
          <div className="diagram-tabs">
            {Object.entries(diagrams).map(([key, diagram]) => (
              <button
                key={key}
                className={`diagram-tab ${selectedDiagram === key ? 'active' : ''}`}
                onClick={() => setSelectedDiagram(key)}
              >
                {diagram.title}
              </button>
            ))}
          </div>
        </div>

        <div className="diagram-container">
          <div className="diagram-header">
            <h2>{currentDiagram.title}</h2>
            <div className="diagram-meta">
              <span className="diagram-type">{currentDiagram.type}</span>
            </div>
          </div>
          
          <div className="diagram-content">
            <Mermaid chart={currentDiagram.content} />
          </div>
          
          <div className="diagram-info">
            <p>This diagram shows the {currentDiagram.title.toLowerCase()} for the {repoName} system.</p>
            <div className="diagram-actions">
              <button className="export-button" onClick={() => {
                // Future: Add export functionality
                alert('Export functionality coming soon!')
              }}>
                Export Diagram
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlowchartPage
