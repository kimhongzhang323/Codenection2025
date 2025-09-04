<div align="center">
  <img src="frontend/public/banner.png" alt="AutoDocX Banner" style="width: 100%; max-width: 100%; height: auto;"/>
  
  <h2 style="font-size: 1.5rem; margin: 1.5rem 0;">AI-Powered Documentation Platform for Developers</h2>
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://openjdk.java.net/)
  [![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
  [![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
</div>

## 🚀 Overview

AutoDocX is a **web-based documentation platform** that revolutionizes how developers create, maintain, and share software documentation. Unlike traditional CLI-driven tools, AutoDocX provides a **100% interface-driven experience** with AI-powered assistance for generating, editing, and maintaining documentation.

### Key Features

- **AI-Powered Documentation Generation** - Automatically generate documentation from GitHub repositories
- **Rich Text Editor** - Obsidian-like editing experience with real-time editing and live preview
- **Intelligent Q&A System** - Ask natural language questions about your documentation
- **Documentation Drift Detection** - Keep docs in sync with code changes
- **Easy Sharing** - Generate public links with configurable permissions
- **TL;DR Summarization** - Get quick summaries of complex documentation
- **GitHub Integration** - Seamless OAuth authentication and repository access

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (React)       │◄──►│   (Spring Boot) │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • Rich Editor   │    │ • REST API      │    │ • GitHub API    │
│ • AI Chat       │    │ • AI Processing │    │ • OpenAI/LLM    │
│ • Document View │    │ • Git Operations│    │ • Vector DB     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Tech Stack

#### Frontend
- **React 19.1.1** - Modern UI framework with concurrent features
- **TypeScript 5.8.3** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Fumadocs** - Documentation framework with rich components
- **React Router** - Client-side routing
- **Framer Motion** - Smooth animations and transitions

#### Backend
- **Spring Boot 3.3.4** - Enterprise Java framework
- **Java 17** - Modern Java with latest features
- **Spring AI 1.0.0-M4** - AI integration framework
- **Spring Security** - Authentication and authorization
- **OAuth2 Client** - GitHub integration
- **JGit 6.10.0** - Git operations
- **JavaParser 3.27.0** - Code analysis and parsing

#### AI & Processing
- **OpenAI Integration** - GPT models for content generation
- **Vector Embeddings** - Semantic search and Q&A
- **Code Analysis** - AST parsing for documentation generation
- **RAG Pipeline** - Retrieval-Augmented Generation

## 🚀 Quick Start

### Prerequisites

- **Java 17+**
- **Node.js 18+**
- **Maven 3.6+**
- **Git**

### Environment Configuration

Create `src/main/resources/application.yml`:

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          github:
            clientId: your-github-client-id
            clientSecret: your-github-client-secret
  ai:
    openai:
      api-key: your-openai-api-key
```

## 📁 Project Structure

```
AutoDocX/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
│   ├── public/             # Static assets
│   └── package.json
├── src/main/java/com/example/AutoDocX/
│   ├── controller/         # REST API controllers
│   ├── service/           # Business logic services
│   ├── model/             # Data models
│   ├── parser/            # Code parsing utilities
│   └── config/            # Configuration classes
├── src/main/resources/    # Configuration files
├── pom.xml               # Maven configuration
└── README.md
```

## 🎯 Core Features

### 1. Repository Import & Processing
- **GitHub Integration**: Connect repositories via OAuth or URL
- **Code Analysis**: Parse Java code using AST analysis
- **Documentation Generation**: AI-powered content creation from code structure

### 2. Rich Documentation Editor
- **WYSIWYG Editing**: Notion-like interface with rich formatting
- **Real-time Collaboration**: Multiple users can edit simultaneously
- **Version Control**: Track changes and maintain history
- **AI Assistant**: Get suggestions and improvements

### 3. Intelligent Search & Q&A
- **Semantic Search**: Find content using natural language
- **AI Q&A**: Ask questions and get contextual answers
- **Citation Support**: Answers include source references

### 4. Documentation Maintenance
- **Drift Detection**: Identify outdated documentation
- **Sync Monitoring**: Track code-documentation alignment
- **Update Suggestions**: AI-powered recommendations

---

<div align="center">
  <strong>Made by Team ❤️ spectrUM</strong>
  <br>
  <strong><em>© Codenection 2025<em>
</div>
