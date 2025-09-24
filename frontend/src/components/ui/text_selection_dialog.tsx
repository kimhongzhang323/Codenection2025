import React, { useState, useEffect } from 'react'
import { useTextSelection } from '../../hooks/useTextSelection'
import { ShiningText } from './shining_text'
import { XIcon } from '../icons/close_icon'
import { motion, AnimatePresence } from 'framer-motion'
import { useAIChat } from '../../contexts/AIChatContext'
import { UpvoteIcon } from '../icons/upvote_icon'
import { DownvoteIcon } from '../icons/downvote_icon'
import './text_selection_dialog.css'

interface AIResponse {
  id: string
  content: string
  timestamp: Date
}

// Typing animation component
const TypingText: React.FC<{ text: string; speed?: number; onComplete?: () => void }> = ({ text, speed = 30, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)

      return () => clearTimeout(timer)
    } else if (onComplete) {
      // Call onComplete when typing is finished
      onComplete()
    }
  }, [currentIndex, text, speed, onComplete])

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('')
    setCurrentIndex(0)
  }, [text])

  return (
    <span>
      {displayedText}
    </span>
  )
}

const TextSelectionDialog: React.FC = () => {
  const { isVisible, position, selectedText, closeDialog, placement } = useTextSelection()
  const { sendMessage } = useAIChat()
  const [isLoading, setIsLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasBeenClosed, setHasBeenClosed] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [typingComplete, setTypingComplete] = useState(false)
  const [voteStatus, setVoteStatus] = useState<'upvoted' | 'downvoted' | null>(null)
  const [dialogWidth, setDialogWidth] = useState<number | null>(null)

  // Reset state when dialog closes naturally (not by user clicking close)
  useEffect(() => {
    if (!isVisible && !hasBeenClosed) {
      setAiResponse(null)
      setIsLoading(false)
      setIsExpanded(false)
      setShowTyping(false)
      setTypingComplete(false)
      setVoteStatus(null)
      setDialogWidth(null)
    }
  }, [isVisible, hasBeenClosed])

  // Utility function to calculate expected dialog width based on content
  const calculateDialogWidth = (content: string): number => {
    // Create a temporary element to measure text width
    const tempElement = document.createElement('div')
    tempElement.style.visibility = 'hidden'
    tempElement.style.position = 'absolute'
    tempElement.style.width = 'auto'
    tempElement.style.fontSize = '13px'
    tempElement.style.lineHeight = '1.5'
    tempElement.style.fontFamily = window.getComputedStyle(document.body).fontFamily
    tempElement.style.padding = '24px' // Account for dialog padding
    tempElement.style.maxWidth = '450px' // Match dialog max-width
    tempElement.textContent = content
    
    document.body.appendChild(tempElement)
    const width = Math.min(Math.max(tempElement.offsetWidth, 280), 450) // Min 280px, max 450px
    document.body.removeChild(tempElement)
    
    return width
  }

  // Simulate AI response when dialog appears
  useEffect(() => {
    if (isVisible && selectedText && !aiResponse && !isLoading && !hasBeenClosed) {
      setIsLoading(true)
      
      // Pre-calculate dialog width to prevent flashing during expansion
      
      // Simulate AI processing time
      setTimeout(() => {
        const mockResponse = generateAIResponse(selectedText)
        
        // Pre-calculate the expected width for the response
        const expectedWidth = calculateDialogWidth(mockResponse.content)
        setDialogWidth(expectedWidth)
        
        setAiResponse(mockResponse)
        setIsLoading(false)
        
        // Set expanded and start typing simultaneously to prevent flash
        setIsExpanded(true)
        setShowTyping(true)
      }, 2000)
    }
  }, [isVisible, selectedText, aiResponse, isLoading, hasBeenClosed])

  // Reset hasBeenClosed when selectedText changes (new selection)
  useEffect(() => {
    setHasBeenClosed(false)
  }, [selectedText])

  const generateAIResponse = (text: string): AIResponse => {
    const responses = [
      `I can explain "${text}" for you. This appears to be related to technical documentation or code concepts. In this context, it typically refers to a specific methodology or framework used in software development. The term encompasses various practices and principles that help developers create more efficient and maintainable code.`,
      `Regarding "${text}", this is a common term in software development. It describes a process or concept that involves systematic approaches to problem-solving and code organization. This methodology helps teams collaborate more effectively and ensures consistent quality across projects.`,
      `The phrase "${text}" is often used in programming contexts. It represents a fundamental concept that helps developers understand complex systems and create better solutions. This approach emphasizes clarity, maintainability, and scalability in software architecture.`,
      `When you see "${text}", it usually indicates a specific pattern or methodology in software engineering. This approach focuses on creating robust, well-documented, and easily maintainable code that can adapt to changing requirements and scale with project growth.`,
      `"${text}" is a key concept that developers encounter frequently. It's important to understand that this refers to a comprehensive approach to software development that prioritizes code quality, documentation, and team collaboration. This methodology helps ensure long-term project success.`
    ]
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    
    return {
      id: Date.now().toString(),
      content: randomResponse,
      timestamp: new Date()
    }
  }

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setHasBeenClosed(true)
    setIsLoading(false)
    setIsExpanded(false)
    setAiResponse(null)
    setShowTyping(false)
    setTypingComplete(false)
    setDialogWidth(null)
    
    // Clear the text selection when closing the dialog
    if (window.getSelection) {
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
      }
    }
    
    closeDialog()
  }

  const handleAskInChat = () => {
    if (selectedText) {
      const message = `Explain "${selectedText}" to me.`
      sendMessage(message)
      // Close the dialog after sending the message
      handleClose({} as React.MouseEvent)
    }
  }

  const handleUpvote = () => {
    if (voteStatus === 'upvoted') {
      // If already upvoted, remove the vote
      setVoteStatus(null)
      console.log('Removed upvote for:', selectedText)
    } else {
      // If not upvoted or downvoted, set to upvoted
      setVoteStatus('upvoted')
      console.log('Upvoted explanation for:', selectedText)
    }
  }

  const handleDownvote = () => {
    if (voteStatus === 'downvoted') {
      // If already downvoted, remove the vote
      setVoteStatus(null)
      console.log('Removed downvote for:', selectedText)
    } else {
      // If not downvoted or upvoted, set to downvoted
      setVoteStatus('downvoted')
      console.log('Downvoted explanation for:', selectedText)
    }
  }

  if (!isVisible || hasBeenClosed) {
    return null
  }

  const dialogStyle = {
    position: 'fixed' as const,
    left: `${position.x}px`,
    zIndex: 1000,
    ...(placement === 'top'
      ? { bottom: `${window.innerHeight - position.y}px`, top: 'auto' }
      : { top: `${position.y}px`, bottom: 'auto' }
    )
  }

  // Calculate the dynamic style for smooth width transition
  const getDynamicDialogStyle = () => {
    const baseStyle: React.CSSProperties = {
      ...dialogStyle,
    }
    
    // Apply calculated width during expansion to prevent flashing
    if (dialogWidth && (isExpanded || showTyping)) {
      baseStyle.width = `${dialogWidth}px`
      baseStyle.maxWidth = `${dialogWidth}px`
      baseStyle.minWidth = `${Math.max(dialogWidth, 280)}px`
    }
    
    return baseStyle
  }

  return (
    <motion.div 
      className="highlight-dialog"
      style={getDynamicDialogStyle()}
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        width: dialogWidth && (isExpanded || showTyping) ? dialogWidth : undefined
      }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.div 
        className={`dialog-content ${dialogWidth && (isExpanded || showTyping) ? 'fixed-width' : ''}`}
        style={{
          '--dialog-calculated-width': dialogWidth ? `${dialogWidth}px` : undefined
        } as React.CSSProperties}
        animate={{
          width: dialogWidth && (isExpanded || showTyping) ? dialogWidth : undefined
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="dialog-header">
          <div className="dialog-status">
            {isLoading ? (
              <ShiningText text="Explaining..." className="dialog-text" />
            ) : (
              <span className="dialog-text">Explained</span>
            )}
          </div>
          <button className="dialog-close" onClick={handleClose}>
            <XIcon size={14} />
          </button>
        </div>
        
        <AnimatePresence>
          {isExpanded && aiResponse && showTyping && (
            <motion.div 
              className={`dialog-response ${typingComplete ? 'typing-complete' : ''}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="response-content">
                {showTyping ? (
                  <TypingText 
                    text={aiResponse.content} 
                    speed={15} 
                    onComplete={() => setTypingComplete(true)}
                  />
                ) : null}
              </div>
              
              {typingComplete && (
                <motion.div 
                  className="dialog-actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <div className="vote-buttons">
                    <button 
                      className={`vote-btn upvote-btn ${voteStatus === 'upvoted' ? 'voted' : ''}`}
                      onClick={handleUpvote}
                      aria-label={voteStatus === 'upvoted' ? 'Remove upvote' : 'Upvote this explanation'}
                      title={voteStatus === 'upvoted' ? 'Remove upvote' : 'Upvote this explanation'}
                    >
                      <UpvoteIcon size={16} />
                    </button>
                    <button 
                      className={`vote-btn downvote-btn ${voteStatus === 'downvoted' ? 'voted' : ''}`}
                      onClick={handleDownvote}
                      aria-label={voteStatus === 'downvoted' ? 'Remove downvote' : 'Downvote this explanation'}
                      title={voteStatus === 'downvoted' ? 'Remove downvote' : 'Downvote this explanation'}
                    >
                      <DownvoteIcon size={16} />
                    </button>
                  </div>
                  <button className="ask-in-chat-btn" onClick={handleAskInChat}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      <path d="M13 8H7"/>
                      <path d="M17 12H7"/>
                    </svg>
                    Ask in Chat
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

export default TextSelectionDialog
