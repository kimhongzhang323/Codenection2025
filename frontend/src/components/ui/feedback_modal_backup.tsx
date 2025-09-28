import React, { useState, useEffect, useRef, useCallback } from 'react'
import { discordNotificationService } from '../../services/discord-notifications'
import './feedback_modal.css'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ScreenshotData {
  blob: Blob
  dataUrl: string
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [feedbackType, setFeedbackType] = useState<'rating' | 'complaint' | null>(null)
  const [starRating, setStarRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [complaintText, setComplaintText] = useState('')
  const [screenshot, setScreenshot] = useState<ScreenshotData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showScreenshotPanel, setShowScreenshotPanel] = useState(false)
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false)
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false)
  const [annotationMode, setAnnotationMode] = useState<'highlight' | 'circle' | 'rectangle' | 'text' | null>(null)
  const [annotations, setAnnotations] = useState<any[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null)

  const handleScreenshotCapture = useCallback(async () => {
    try {
      setIsCapturingScreenshot(true)
      
      // If modal is not open, open it first and set to complaint mode
      if (!isOpen) {
        console.log('Opening feedback modal for screenshot...')
        alert('Screenshot captured! Opening feedback form...')
        return
      }
      
      // Use modern Screen Capture API with enhanced selection
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            mediaSource: 'screen'
          }
        })
        
        const video = document.createElement('video')
        video.srcObject = stream
        video.play()
        
        video.addEventListener('loadedmetadata', () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          ctx?.drawImage(video, 0, 0)
          
          canvas.toBlob((blob) => {
            if (blob) {
              const dataUrl = canvas.toDataURL('image/png')
              setScreenshot({ blob, dataUrl })
              setFeedbackType('complaint')
              setShowScreenshotPanel(true)
              setShowAnnotationEditor(true)
              setAnnotations([])
            }
          }, 'image/png')
          
          // Stop the stream
          stream.getTracks().forEach(track => track.stop())
        })
      } else {
        alert('Screenshot capture is not supported in this browser. Please take a screenshot manually and describe the issue.')
        setFeedbackType('complaint')
        setShowScreenshotPanel(true)
      }
    } catch (error) {
      console.error('Screenshot capture failed:', error)
      if (error instanceof Error && error.name === 'NotAllowedError') {
        alert('Screenshot permission denied. You can still describe the issue in text.')
      } else {
        alert('Failed to capture screenshot. Please describe the issue in text.')
      }
      setFeedbackType('complaint')
      setShowScreenshotPanel(true)
    } finally {
      setIsCapturingScreenshot(false)
    }
  }, [isOpen])

  // Annotation drawing functions
  const startDrawing = useCallback((e: React.MouseEvent) => {
    if (!annotationMode || !annotationCanvasRef.current) return
    
    const rect = annotationCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setIsDrawing(true)
    const newAnnotation = {
      type: annotationMode,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      id: Date.now()
    }
    setCurrentAnnotation(newAnnotation)
  }, [annotationMode])
  
  const draw = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentAnnotation || !annotationCanvasRef.current) return
    
    const rect = annotationCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setCurrentAnnotation(prev => prev ? { ...prev, endX: x, endY: y } : null)
  }, [isDrawing, currentAnnotation])
  
  const stopDrawing = useCallback(() => {
    if (currentAnnotation && isDrawing) {
      setAnnotations(prev => [...prev, currentAnnotation])
    }
    setIsDrawing(false)
    setCurrentAnnotation(null)
  }, [currentAnnotation, isDrawing])
  
  const renderAnnotations = useCallback(() => {
    if (!annotationCanvasRef.current) return
    
    const canvas = annotationCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw all saved annotations
    [...annotations, currentAnnotation].filter(Boolean).forEach(annotation => {
      if (!annotation) return
      
      ctx.strokeStyle = annotation.type === 'highlight' ? '#ffff00' : '#ff0000'
      ctx.lineWidth = annotation.type === 'highlight' ? 8 : 3
      ctx.globalAlpha = annotation.type === 'highlight' ? 0.6 : 1
      
      if (annotation.type === 'circle') {
        const radius = Math.sqrt(
          Math.pow(annotation.endX - annotation.startX, 2) + 
          Math.pow(annotation.endY - annotation.startY, 2)
        )
        ctx.beginPath()
        ctx.arc(annotation.startX, annotation.startY, radius, 0, 2 * Math.PI)
        ctx.stroke()
      } else if (annotation.type === 'rectangle') {
        ctx.beginPath()
        ctx.rect(
          annotation.startX, 
          annotation.startY, 
          annotation.endX - annotation.startX, 
          annotation.endY - annotation.startY
        )
        ctx.stroke()
      }
    })
  }, [annotations, currentAnnotation])
  
  useEffect(() => {
    renderAnnotations()
  }, [renderAnnotations])
  
  const generateAnnotatedImage = useCallback(async (): Promise<string> => {
    if (!screenshot) return ''
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    
    const img = new Image()
    img.src = screenshot.dataUrl
    
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw original image
        ctx.drawImage(img, 0, 0)
        
        // Scale annotations to match image size
        const scaleX = img.width / (annotationCanvasRef.current?.width || 1)
        const scaleY = img.height / (annotationCanvasRef.current?.height || 1)
        
        // Draw annotations
        annotations.forEach(annotation => {
          ctx.strokeStyle = annotation.type === 'highlight' ? '#ffff00' : '#ff0000'
          ctx.lineWidth = (annotation.type === 'highlight' ? 8 : 3) * Math.min(scaleX, scaleY)
          ctx.globalAlpha = annotation.type === 'highlight' ? 0.6 : 1
          
          if (annotation.type === 'circle') {
            const radius = Math.sqrt(
              Math.pow((annotation.endX - annotation.startX) * scaleX, 2) + 
              Math.pow((annotation.endY - annotation.startY) * scaleY, 2)
            )
            ctx.beginPath()
            ctx.arc(annotation.startX * scaleX, annotation.startY * scaleY, radius, 0, 2 * Math.PI)
            ctx.stroke()
          } else if (annotation.type === 'rectangle') {
            ctx.beginPath()
            ctx.rect(
              annotation.startX * scaleX, 
              annotation.startY * scaleY, 
              (annotation.endX - annotation.startX) * scaleX, 
              (annotation.endY - annotation.startY) * scaleY
            )
            ctx.stroke()
          }
        })
        
        resolve(canvas.toDataURL('image/png'))
      }
    })
  }, [screenshot, annotations])
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFeedbackType(null)
      setStarRating(0)
      setComplaintText('')
      setScreenshot(null)
      setShowScreenshotPanel(false)
      setIsCapturingScreenshot(false)
      setShowAnnotationEditor(false)
      setAnnotationMode(null)
      setAnnotations([])
    }
  }, [isOpen])

  // Keyboard shortcut for screenshot within modal (Ctrl+Shift+S)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault()
        handleScreenshotCapture()
      }
    }

    // Add listener only when modal is open
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleScreenshotCapture])

  const handleStarClick = (rating: number) => {
    setStarRating(rating)
  }

  const handleSubmitFeedback = async () => {
    if (feedbackType === 'rating' && starRating === 0) {
      alert('Please select a star rating before submitting.')
      return
    }

    if (feedbackType === 'complaint' && !complaintText.trim()) {
      alert('Please describe the issue before submitting.')
      return
    }

    setIsSubmitting(true)

    try {
      // Use existing Discord notification service
      if (!discordNotificationService.isConfigured()) {
        // If Discord isn't configured, show a helpful message
        alert('Discord notifications are not configured. Please configure Discord webhook in the settings to receive feedback.')
        setIsSubmitting(false)
        return
      }

      // Create Discord embed payload
      const embed = {
        title: feedbackType === 'rating' ? '⭐ User Rating' : '🐛 User Bug Report',
        description: feedbackType === 'rating' 
          ? `User gave ${starRating}/5 stars` 
          : complaintText || 'No description provided',
        color: feedbackType === 'rating' ? 0x57F287 : 0xED4245,
        fields: [
          ...(feedbackType === 'rating' ? [{
            name: 'Rating',
            value: `${starRating}/5 stars`,
            inline: true
          }] : []),
          {
            name: 'Timestamp',
            value: new Date().toLocaleString(),
            inline: true
          },
          {
            name: 'Page URL',
            value: window.location.href,
            inline: false
          },
          {
            name: 'Browser Info',
            value: navigator.userAgent.substring(0, 100) + '...',
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'AutoDocX User Feedback'
        }
      }

      const payload = {
        username: 'AutoDocX Feedback Bot',
        avatar_url: 'https://github.com/kimhongzhang323/Codenection2025/blob/master/static/logo.png?raw=true',
        embeds: [embed]
      }

      const success = await discordNotificationService.sendNotification(payload)
      
      if (!success) {
        throw new Error('Failed to send notification to Discord')
      }
      
      // Log screenshot info if available (Discord service doesn't handle file uploads directly)
      if (screenshot) {
        console.log('Feedback submitted with screenshot attached')
      }

      // Show success message
      if (feedbackType === 'rating') {
        alert(`Thank you for your ${starRating}-star rating! Your feedback helps us improve.`)
      } else {
        alert('Thank you for reporting the issue! We\'ll look into it and get back to you.')
      }

      onClose()
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('Failed to submit feedback. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h2>User Feedback</h2>
          <button className="feedback-modal-close" onClick={onClose} aria-label="Close feedback modal">
            ×
          </button>
        </div>

        <div className="feedback-modal-content">
          {!feedbackType ? (
            // Initial choice screen
            <div className="feedback-type-selection">
              <h3>How can we help you today?</h3>
              <div className="feedback-options">
                <button
                  className="feedback-option rating-option"
                  onClick={() => setFeedbackType('rating')}
                >
                  <div className="feedback-option-icon">⭐</div>
                  <div className="feedback-option-text">
                    <h4>Rate Our Service</h4>
                    <p>Give us a star rating (1-5)</p>
                  </div>
                </button>
                
                <button
                  className="feedback-option complaint-option"
                  onClick={() => setFeedbackType('complaint')}
                >
                  <div className="feedback-option-icon">🐛</div>
                  <div className="feedback-option-text">
                    <h4>Report an Issue</h4>
                    <p>Tell us about a problem or bug</p>
                  </div>
                </button>
              </div>
            </div>
          ) : feedbackType === 'rating' ? (
            // Star rating screen
            <div className="feedback-rating">
              <h3>How would you rate your experience?</h3>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star ${star <= (hoveredStar || starRating) ? 'filled' : ''}`}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="rating-labels">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
              {starRating > 0 && (
                <p className="rating-message">
                  You selected {starRating} star{starRating > 1 ? 's' : ''}. Thank you!
                </p>
              )}
            </div>
          ) : (
            // Complaint screen
            <div className="feedback-complaint">
              {!showScreenshotPanel ? (
                <>
                  <h3>Report an Issue</h3>
                  <p>Help us understand the problem you're experiencing.</p>
                  
                  <div className="screenshot-option">
                    <button
                      className="screenshot-button"
                      onClick={handleScreenshotCapture}
                      disabled={isCapturingScreenshot}
                    >
                      {isCapturingScreenshot ? '📷 Capturing...' : '📷 Take Screenshot'}
                    </button>
                    <span className="keyboard-shortcut">or press Ctrl+Shift+S</span>
                  </div>
                  
                  <button
                    className="skip-screenshot-button"
                    onClick={() => setShowScreenshotPanel(true)}
                  >
                    Skip Screenshot & Describe Issue
                  </button>
                </>
              ) : (
                <div className="issue-description-panel">
                  <h3>Describe the Issue</h3>
                  
                  {screenshot && (
                    <div className="screenshot-preview">
                      <h4>Screenshot captured:</h4>
                      <img src={screenshot.dataUrl} alt="Screenshot" className="screenshot-image" />
                    </div>
                  )}
                  
                  <textarea
                    className="complaint-textarea"
                    placeholder="Please describe the issue you're experiencing in detail..."
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    rows={3}
                  />
                  
                  <div className="panel-actions">
                    <button
                      className="back-button"
                      onClick={() => setShowScreenshotPanel(false)}
                    >
                      ← Back
                    </button>
                    <button
                      className="done-button"
                      onClick={handleSubmitFeedback}
                      disabled={isSubmitting || !complaintText.trim()}
                    >
                      {isSubmitting ? 'Submitting...' : 'Done'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="feedback-modal-footer">
          {feedbackType && (
            <button
              className="back-to-selection"
              onClick={() => {
                setFeedbackType(null)
                setShowScreenshotPanel(false)
              }}
            >
              ← Back
            </button>
          )}
          
          <div className="footer-actions">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            
            {(feedbackType === 'rating' && starRating > 0) && (
              <button
                className="submit-button"
                onClick={handleSubmitFeedback}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  )
}

export default FeedbackModal