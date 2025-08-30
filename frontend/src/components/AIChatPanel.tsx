import React, { useState, useRef, useEffect } from 'react'
import './AIChatPanel.css'
import { XIcon } from './close_icon'
import { SquareArrowUpIcon } from './send_icon'
import { AtSignIcon } from './mention_icon'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
}

interface AIChatPanelProps {
  isOpen: boolean
  onToggle: () => void
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ isOpen, onToggle }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isAgentMode, setIsAgentMode] = useState(true) // true for Agent mode, false for Ask mode
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

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

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I understand you're asking about "${userMessage.content}". This is a simulated response from the AI assistant. In a real implementation, this would connect to your AI service.`,
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleModeToggle = () => {
    setIsAgentMode(!isAgentMode)
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
            onClick={onToggle}
            aria-label="Close chat"
          >
            <XIcon size={16} />
          </div>
        </div>

        {/* Content area with messages */}
        <div className="ai-chat-content">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`ai-chat-message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-content">
                {message.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="ai-chat-message ai-message">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
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
