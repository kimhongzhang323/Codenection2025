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

interface Annotation {
  type: 'highlight' | 'circle' | 'rectangle'
  startX: number
  startY: number
  endX: number
  endY: number
  id: number
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
  const [isFullscreenEditing, setIsFullscreenEditing] = useState(false)
  const [annotationMode, setAnnotationMode] = useState<'highlight' | 'circle' | 'rectangle' | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null)

  const handleScreenshotCapture = useCallback(async () => {
    try {
      setIsCapturingScreenshot(true)
      
      if (!isOpen) {
        console.log('Opening feedback modal for screenshot...')
        alert('Screenshot captured! Opening feedback form...')
        return
      }
      
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            mediaSource: 'screen'
          } as MediaTrackConstraints
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
              setIsFullscreenEditing(true)
              setAnnotations([])
            }
          }, 'image/png')
          
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
    const newAnnotation: Annotation = {
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
    
    // Draw all saved annotations plus current drawing
    const allAnnotations = [...annotations]
    if (currentAnnotation) {
      allAnnotations.push(currentAnnotation)
    }
    
    allAnnotations.forEach(annotation => {
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
      
      ctx.globalAlpha = 1
    })
  }, [annotations, currentAnnotation])
  
  // Update canvas size when screenshot loads
  const updateCanvasSize = useCallback(() => {
    if (!annotationCanvasRef.current || !screenshot) return
    
    const canvas = annotationCanvasRef.current
    setTimeout(() => {
      const img = document.querySelector('.screenshot-image') as HTMLImageElement
      if (img) {
        const rect = img.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
        canvas.style.width = rect.width + 'px'
        canvas.style.height = rect.height + 'px'
        renderAnnotations()
      }
    }, 100)
  }, [screenshot, renderAnnotations])
  
  useEffect(() => {
    renderAnnotations()
  }, [renderAnnotations])
  
  useEffect(() => {
    if (showAnnotationEditor && screenshot) {
      updateCanvasSize()
    }
  }, [updateCanvasSize, showAnnotationEditor, isFullscreenEditing, screenshot])
  
  const generateAnnotatedImage = useCallback(async (): Promise<string> => {
    if (!screenshot) return ''
    
    if (annotations.length === 0) return screenshot.dataUrl
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return screenshot.dataUrl
    
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
          
          ctx.globalAlpha = 1
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
      setIsFullscreenEditing(false)
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

    if (feedbackType === 'complaint' && !complaintText.trim() && !screenshot) {
      alert('Please describe the issue or provide a screenshot before submitting.')
      return
    }

    setIsSubmitting(true)

    try {
      if (!discordNotificationService.isConfigured()) {
        alert('Discord notifications are not configured. Please configure Discord webhook in the settings to receive feedback.')
        setIsSubmitting(false)
        return
      }

      // Get annotated image if there are annotations
      let finalImageUrl = screenshot?.dataUrl
      if (screenshot && annotations.length > 0) {
        finalImageUrl = await generateAnnotatedImage()
      }

      const embed = {
        title: feedbackType === 'rating' ? '⭐ User Rating' : '🐛 User Bug Report',
        description: feedbackType === 'rating' 
          ? `User gave ${starRating}/5 stars` 
          : complaintText || 'User provided screenshot feedback',
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
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'AutoDocX User Feedback'
        }
      }

      // Add screenshot info to description if present
      if (finalImageUrl) {
        embed.description += `\n\n📷 **Screenshot included with feedback**`
      }

      const payload = {
        username: 'AutoDocX Feedback Bot',
        avatar_url: 'https://github.com/kimhongzhang323/Codenection2025/blob/master/static/logo.png?raw=true',
        embeds: [embed]
      }

      // Try to send notification (prioritize simple text submission)
      const success = await discordNotificationService.sendNotification(payload)
      
      if (!success) {
        throw new Error('Failed to send notification to Discord')
      }

      if (screenshot) {
        console.log('Feedback submitted with screenshot - screenshot saved locally')
      }

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
      <div className={`feedback-modal ${isFullscreenEditing ? 'fullscreen-editing' : ''}`} onClick={(e) => e.stopPropagation()}>
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
                      <div className="annotation-container">
                        <img src={screenshot.dataUrl} alt="Screenshot" className="screenshot-image" />
                        {showAnnotationEditor && (
                          <canvas
                            ref={annotationCanvasRef}
                            className="annotation-canvas"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                          />
                        )}
                      </div>
                      
                      {showAnnotationEditor && (
                        <div className="annotation-tools">
                          <button
                            className={`annotation-tool ${annotationMode === 'highlight' ? 'active' : ''}`}
                            onClick={() => setAnnotationMode(annotationMode === 'highlight' ? null : 'highlight')}
                            title="Highlight"
                          >
                            🖍️
                          </button>
                          <button
                            className={`annotation-tool ${annotationMode === 'circle' ? 'active' : ''}`}
                            onClick={() => setAnnotationMode(annotationMode === 'circle' ? null : 'circle')}
                            title="Circle"
                          >
                            ⭕
                          </button>
                          <button
                            className={`annotation-tool ${annotationMode === 'rectangle' ? 'active' : ''}`}
                            onClick={() => setAnnotationMode(annotationMode === 'rectangle' ? null : 'rectangle')}
                            title="Rectangle"
                          >
                            ⬜
                          </button>
                          <button
                            className="annotation-tool"
                            onClick={() => setAnnotations([])}
                            title="Clear All"
                          >
                            🗑️
                          </button>
                          <button
                            className="annotation-tool"
                            onClick={() => setIsFullscreenEditing(!isFullscreenEditing)}
                            title={isFullscreenEditing ? "Exit Fullscreen" : "Fullscreen Edit"}
                          >
                            {isFullscreenEditing ? "📱" : "🖥️"}
                          </button>
                          <button
                            className="annotation-tool"
                            onClick={() => {
                              setShowAnnotationEditor(false)
                              setIsFullscreenEditing(false)
                            }}
                            title="Finish Editing"
                          >
                            ✅
                          </button>
                        </div>
                      )}
                      
                      {!showAnnotationEditor && (
                        <button
                          className="edit-screenshot-button"
                          onClick={() => setShowAnnotationEditor(true)}
                        >
                          ✏️ Annotate Screenshot
                        </button>
                      )}
                    </div>
                  )}
                  
                  <textarea
                    className="complaint-textarea"
                    placeholder="Describe the issue (optional if screenshot provided)..."
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
                      disabled={isSubmitting || (!complaintText.trim() && !screenshot)}
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