import React, { useState, useRef, useEffect } from 'react'
import './ai_chat_panel.css'
import { XIcon } from '../icons/close_icon'
import { SquareArrowUpIcon } from '../icons/send_icon'
import { AtSignIcon } from '../icons/mention_icon'
import { ShiningText } from './shining_text'
import { GlobeIcon } from '../icons/globe_icon'
import { SparklesIcon } from '../icons/sparkles_icon'
import { motion, AnimatePresence } from 'framer-motion'
import { useAIChat } from '../../contexts/AIChatContext'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  isTyping?: boolean
}

// Typing animation component for AI messages
const TypingMessage: React.FC<{ content: string; onComplete?: () => void; onTextChange?: (text: string) => void }> = ({ content, onComplete, onTextChange }) => {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < content.length) {
      const timer = setTimeout(() => {
        const newText = displayedText + content[currentIndex]
        setDisplayedText(newText)
        setCurrentIndex(prev => prev + 1)
        
        // Notify parent component about text change for auto-scroll
        if (onTextChange) {
          onTextChange(newText)
        }
      }, 10) // Faster typing speed (10ms per character)

      return () => clearTimeout(timer)
    } else if (onComplete) {
      onComplete()
    }
  }, [currentIndex, content, onComplete, displayedText, onTextChange])

  // Reset when content changes
  useEffect(() => {
    setDisplayedText('')
    setCurrentIndex(0)
  }, [content])

  return (
    <div className="message-content">
      {displayedText}
    </div>
  )
}

export const AIChatPanel: React.FC = () => {
  const { isOpen, closeChat, initialMessage, clearInitialMessage } = useAIChat()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isAgentMode, setIsAgentMode] = useState(true) // true for Agent mode, false for Ask mode
  const [showSearch, setShowSearch] = useState(false) // false for web search disabled by default
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }

  // Auto-scroll when messages change or typing animation updates
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle text changes during typing animation
  const handleTypingTextChange = () => {
    // Use requestAnimationFrame to ensure DOM is updated before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom)
    })
  }

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle initial message from context
  useEffect(() => {
    if (initialMessage && isOpen) {
      // Send the initial message automatically
      const userMessage: Message = {
        id: Date.now().toString(),
        content: initialMessage,
        sender: 'user',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, userMessage])
      setIsTyping(true)

      // Simulate AI response with typing animation
      setTimeout(() => {
        const searchText = showSearch ? ' (with web search)' : ''
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `I understand you're asking about "${initialMessage}"${searchText}. This is a simulated response from the AI assistant. In a real implementation, this would connect to your AI service${showSearch ? ' and search the web for current information' : ''}.`,
          sender: 'ai',
          timestamp: new Date(),
          isTyping: true
        }
        setMessages(prev => [...prev, aiMessage])
        setIsTyping(false)
      }, 1500)

      // Clear the initial message after sending
      clearInitialMessage()
    }
  }, [initialMessage, isOpen, showSearch, clearInitialMessage])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Simulate AI response with typing animation
    setTimeout(() => {
      const searchText = showSearch ? ' (with web search)' : ''
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I understand you're asking about "${userMessage.content}"${searchText}. This is a simulated response from the AI assistant. In a real implementation, this would connect to your AI service${showSearch ? ' and search the web for current information' : ''}.`,
        sender: 'ai',
        timestamp: new Date(),
        isTyping: true
      }
      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleModeToggle = () => {
    setIsAgentMode(!isAgentMode)
  }

  const handleSearchToggle = () => {
    setShowSearch(!showSearch)
  }

  const handleTypingComplete = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isTyping: false } : msg
    ))
  }

  return (
    <>
      {/* Enhanced chat panel */}
      <div className={`ai-chat-panel ${isOpen ? 'is-open' : ''}`}>
        {/* Top controls */}
        <div className="ai-chat-top-controls">
          <button 
            className="ai-chat-clear-button"
            onClick={() => setMessages([])}
            aria-label="Clear chat"
          >
            Clear Chat
          </button>
          <div 
            className="ai-chat-close"
            onClick={closeChat}
            aria-label="Close chat"
          >
            <XIcon size={16} />
          </div>
        </div>

        {/* Content area with messages */}
        <div ref={contentRef} className="ai-chat-content">
          {messages.length === 0 ? (
            <div className="ai-chat-empty-state">
              <div className="ai-chat-empty-icon">
                <SparklesIcon size={24} />
              </div>
              <h3>AI Assistant</h3>
              <p>Ask me anything about your documentation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`ai-chat-message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
              >
                {message.sender === 'ai' && message.isTyping ? (
                  <TypingMessage 
                    content={message.content} 
                    onComplete={() => handleTypingComplete(message.id)}
                    onTextChange={handleTypingTextChange}
                  />
                ) : (
                  <div className="message-content">
                    {message.content}
                  </div>
                )}
              </div>
            ))
          )}
          {isTyping && (
            <div className="ai-chat-message ai-message">
              <div className="message-content">
                <ShiningText text="AI is thinking..." className="text-sm" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Blank chat box container */}
        <div className="ai-chat-input-box">
          <div className="ai-chat-mini-buttons">
            <button className="ai-chat-at-button">
              <AtSignIcon size={14} />
            </button>
            <div className="ai-chat-tab-indicator">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              <span>1 Tab</span>
            </div>
          </div>
          <textarea
            ref={inputRef}
            className="ai-chat-textarea"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask AI something..."
            rows={1}
          />
          {/* Bottom controls row */}
          <div className="ai-chat-bottom-controls">
            {/* Left side controls */}
            <div className="ai-chat-left-controls">
              {/* Mode toggle button */}
              <button 
                className="ai-chat-mode-button"
                onClick={handleModeToggle}
                aria-label={`Switch to ${isAgentMode ? 'Ask' : 'Agent'} mode`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                <span>{isAgentMode ? 'Agent' : 'Ask'}</span>
              </button>
                             {/* Web search button */}
               <motion.button 
                 className={`ai-chat-search-button ${showSearch ? 'active' : ''}`}
                 onClick={handleSearchToggle}
                 aria-label={`${showSearch ? 'Disable' : 'Enable'} web search`}
                 layout
                 transition={{
                   type: "spring",
                   stiffness: 300,
                   damping: 25
                 }}
               >
                 <motion.div
                   animate={{ rotate: showSearch ? 360 : 0 }}
                   transition={{
                     type: "spring",
                     stiffness: 300,
                     damping: 20
                   }}
                 >
                   <GlobeIcon size={14} />
                 </motion.div>
                 <AnimatePresence mode="wait">
                   {showSearch && (
                     <motion.span 
                       className="ai-chat-search-label"
                       initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                       animate={{ width: "auto", opacity: 1, marginLeft: 6 }}
                       exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                       transition={{
                         type: "spring",
                         stiffness: 300,
                         damping: 25
                       }}
                       style={{ overflow: "hidden" }}
                     >
                       Search
                     </motion.span>
                   )}
                 </AnimatePresence>
               </motion.button>
            </div>
            {/* Send button */}
            <button 
              className="ai-chat-send-button"
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              aria-label="Send message"
            >
              <SquareArrowUpIcon size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
