import React, { useState } from 'react'
import PlantUML from './plantuml'
import './embedded_flowchart.css'

interface EmbeddedFlowchartProps {
  className?: string
}

const EmbeddedFlowchart: React.FC<EmbeddedFlowchartProps> = ({ 
  className = '' 
}) => {
  const [selectedDiagram, setSelectedDiagram] = useState<string>('system-overview')
  
  // Sample system diagrams - you can modify these based on your actual system architecture
  const diagrams = {
    'system-overview': {
      title: 'System Overview',
      type: 'plantuml',
      content: `@startuml
!theme plain
skinparam backgroundColor #FFFFFF
skinparam componentStyle rectangle

actor User
component "Frontend React App" as Frontend
component "API Gateway" as Gateway
component "Authentication Service" as Auth
component "Documentation Service" as DocService
component "Repository Service" as RepoService
component "GitHub API" as GitHub
database "User Database" as UserDB
database "Documentation Storage" as DocStorage

User --> Frontend
Frontend --> Gateway
Gateway --> Auth
Gateway --> DocService
Gateway --> RepoService
DocService --> GitHub
RepoService --> GitHub
Auth --> UserDB
DocService --> DocStorage

@enduml`
    },
    'data-flow': {
      title: 'Data Flow Diagram',
      type: 'plantuml',
      content: `@startuml
!theme plain
skinparam backgroundColor #FFFFFF

start
:User Request;
:Frontend;
:Authentication Check;
if (Authenticated?) then (yes)
  :API Request;
  :Backend Processing;
  fork
    :Database Query;
  fork again
    :GitHub API Call;
  end fork
  :Response Data;
  :Frontend Update;
  :User Interface;
else (no)
  :Login Page;
  stop
endif
stop
@enduml`
    },
    'component-architecture': {
      title: 'Component Architecture',
      type: 'plantuml',
      content: `@startuml
!theme plain
skinparam backgroundColor #FFFFFF

package "Frontend Layer" {
  [App Component]
  [Documentation Page]
  [Changelog Page]
  [Flowchart Page]
  [Authentication Components]
}

package "Service Layer" {
  [API Service]
  [GitHub Service]
  [Auth Service]
}

package "Backend Layer" {
  [Spring Boot API]
  [Database]
  [External APIs]
}

[App Component] --> [Documentation Page]
[App Component] --> [Changelog Page]
[App Component] --> [Flowchart Page]
[App Component] --> [Authentication Components]
[Documentation Page] --> [API Service]
[Changelog Page] --> [GitHub Service]
[Flowchart Page] --> [API Service]
[Authentication Components] --> [Auth Service]
[API Service] --> [Spring Boot API]
[GitHub Service] --> [External APIs]
[Auth Service] --> [Spring Boot API]
[Spring Boot API] --> [Database]

@enduml`
    },
    'user-journey': {
      title: 'User Journey Flow',
      type: 'plantuml',
      content: `@startuml
!theme plain
skinparam backgroundColor #FFFFFF

start
:User Visits Site;
if (First Time?) then (yes)
  :Registration;
  :Account Created;
else (no)
  :Login;
  if (Credentials Valid?) then (yes)
    :Dashboard;
  else (no)
    :Error Message;
    :Login;
  endif
endif
:Dashboard;
:Browse Repositories;
:Select Repository;
:View Documentation;
:Navigate Sections;
fork
  :View Changelog;
  :Browse Commits;
fork again
  :View Flowcharts;
  :Analyze Architecture;
end fork
stop
@enduml`
    }
  }

  const currentDiagram = diagrams[selectedDiagram as keyof typeof diagrams]

  return (
    <div className={`embedded-flowchart ${className}`}>
      <div className="embedded-flowchart-header">
        <h3>System Architecture & Flow Diagrams</h3>
        <p>Interactive system diagrams for this repository</p>
      </div>

      <div className="diagram-selector-tabs">
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

      <div className="diagram-container-embedded">
        <div className="diagram-header-embedded">
          <h4>{currentDiagram.title}</h4>
          <span className="diagram-type-badge">{currentDiagram.type}</span>
        </div>
        
        <div className="diagram-content-embedded">
          <PlantUML code={currentDiagram.content} />
        </div>
        
        <div className="diagram-info-embedded">
          <p>This diagram shows the {currentDiagram.title.toLowerCase()} for the system architecture.</p>
        </div>
      </div>
    </div>
  )
}

export default EmbeddedFlowchart
