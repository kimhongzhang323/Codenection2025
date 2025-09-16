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

  // Reset state when dialog closes naturally (not by user clicking close)
  useEffect(() => {
    if (!isVisible && !hasBeenClosed) {
      setAiResponse(null)
      setIsLoading(false)
      setIsExpanded(false)
      setShowTyping(false)
      setTypingComplete(false)
      setVoteStatus(null)
    }
  }, [isVisible, hasBeenClosed])

  // Simulate AI response when dialog appears
  useEffect(() => {
    if (isVisible && selectedText && !aiResponse && !isLoading && !hasBeenClosed) {
      setIsLoading(true)
      
      // Simulate AI processing time
      setTimeout(() => {
        const mockResponse = generateAIResponse(selectedText)
        setAiResponse(mockResponse)
        setIsLoading(false)
        setIsExpanded(true)
        // Start typing animation after a short delay
        setTimeout(() => {
          setShowTyping(true)
        }, 100)
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

  return (
    <motion.div 
      className="highlight-dialog"
      style={dialogStyle}
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="dialog-content">
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
          {isExpanded && aiResponse && (
            <motion.div 
              className={`dialog-response ${typingComplete ? 'typing-complete' : ''}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="response-content">
                {showTyping ? (
                  <TypingText 
                    text={aiResponse.content} 
                    speed={15} 
                    onComplete={() => setTypingComplete(true)}
                  />
                ) : (
                  aiResponse.content
                )}
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
      </div>
    </motion.div>
  )
}

export default TextSelectionDialog
