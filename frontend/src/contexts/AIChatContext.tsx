import React, { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface AIChatContextType {
  isOpen: boolean
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  sendMessage: (message: string) => void
  setInitialMessage: (message: string) => void
  initialMessage: string | null
  clearInitialMessage: () => void
  setRepositoryInfo: (gitUrl: string, branch?: string) => void
  repositoryInfo: { gitUrl: string; branch: string } | null
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined)

export const useAIChat = () => {
  const context = useContext(AIChatContext)
  if (context === undefined) {
    throw new Error('useAIChat must be used within an AIChatProvider')
  }
  return context
}

interface AIChatProviderProps {
  children: ReactNode
}

export const AIChatProvider: React.FC<AIChatProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true) // Changed to true - expanded by default
  const [initialMessage, setInitialMessageState] = useState<string | null>(null)
  const [repositoryInfo, setRepositoryInfoState] = useState<{ gitUrl: string; branch: string } | null>(null)

  const openChat = () => setIsOpen(true)
  const closeChat = () => setIsOpen(false)
  const toggleChat = () => setIsOpen(!isOpen)
  
  const sendMessage = (message: string) => {
    // This will be handled by the AIChatPanel component
    // We just need to open the chat and set the initial message
    setInitialMessageState(message)
    setIsOpen(true)
  }

  const setInitialMessage = (message: string) => {
    setInitialMessageState(message)
  }

  const clearInitialMessage = () => {
    setInitialMessageState(null)
  }

  const setRepositoryInfo = (gitUrl: string, branch: string = 'main') => {
    setRepositoryInfoState({ gitUrl, branch })
  }

  const value: AIChatContextType = {
    isOpen,
    openChat,
    closeChat,
    toggleChat,
    sendMessage,
    setInitialMessage,
    initialMessage,
    clearInitialMessage,
    setRepositoryInfo,
    repositoryInfo
  }

  return (
    <AIChatContext.Provider value={value}>
      {children}
    </AIChatContext.Provider>
  )
}
