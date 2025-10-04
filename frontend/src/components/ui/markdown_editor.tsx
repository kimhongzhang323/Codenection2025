import React, { useState, useRef, useCallback, useEffect } from 'react'
import './markdown_editor.css'
import { AIRewritePanel } from './ai_rewrite_panel'

interface MarkdownEditorProps {
  content: string
  onContentChange: (content: string) => void
  onSave?: () => void
  placeholder?: string
}

interface ToolbarAction {
  id: string
  label: string
  icon: React.ReactNode
  action: (editor: HTMLTextAreaElement) => void
  shortcut?: string
}

export function MarkdownEditor({ 
  content, 
  onContentChange, 
  onSave, 
  placeholder = "Start writing..." 
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showToolbar, setShowToolbar] = useState(true)
  const [isAIRewriteOpen, setIsAIRewriteOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  
  // Handle AI rewrite
  const handleAIRewrite = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.substring(start, end)
    
    if (selected.trim()) {
      setSelectedText(selected)
      setIsAIRewriteOpen(true)
    } else {
      alert('Please select some text to rewrite.')
    }
  }, [content])

  // Handle rewrite result
  const handleRewriteResult = useCallback((newText: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    
    const newContent = content.substring(0, start) + newText + content.substring(end)
    onContentChange(newContent)
    
    setTimeout(() => {
      textarea.setSelectionRange(start, start + newText.length)
      textarea.focus()
    }, 0)
  }, [content, onContentChange])

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    autoResize()
  }, [content, autoResize])

  // Insert text at cursor position
  const insertText = useCallback((before: string, after: string = '', selectText: boolean = true) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    const newText = before + (selectText ? selectedText : '') + after
    const newContent = content.substring(0, start) + newText + content.substring(end)
    
    onContentChange(newContent)
    
    // Set cursor position
    setTimeout(() => {
      if (selectText && selectedText) {
        textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
      } else {
        textarea.setSelectionRange(start + before.length, start + before.length)
      }
      textarea.focus()
    }, 0)
  }, [content, onContentChange])

  // Wrap selected text
  const wrapText = useCallback((wrapper: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    if (selectedText) {
      const newContent = content.substring(0, start) + 
                        wrapper + selectedText + wrapper + 
                        content.substring(end)
      onContentChange(newContent)
      
      setTimeout(() => {
        textarea.setSelectionRange(start + wrapper.length, end + wrapper.length)
        textarea.focus()
      }, 0)
    } else {
      insertText(wrapper, wrapper, false)
    }
  }, [content, onContentChange, insertText])

  // Toolbar actions
  const toolbarActions: ToolbarAction[] = React.useMemo(() => [
    {
      id: 'bold',
      label: 'Bold',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
      action: () => wrapText('**'),
      shortcut: 'Ctrl+B'
    },
    {
      id: 'italic',
      label: 'Italic',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
      action: () => wrapText('*'),
      shortcut: 'Ctrl+I'
    },
    {
      id: 'code',
      label: 'Inline Code',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>,
      action: () => wrapText('`'),
      shortcut: 'Ctrl+`'
    },
    {
      id: 'heading',
      label: 'Heading',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 12h12"/><path d="M6 20V4"/><path d="M18 20V4"/></svg>,
      action: () => insertText('## ', ''),
      shortcut: 'Ctrl+H'
    },
    {
      id: 'link',
      label: 'Link',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
      action: () => {
        const textarea = textareaRef.current
        if (!textarea) return
        const selectedText = content.substring(textarea.selectionStart, textarea.selectionEnd)
        if (selectedText) {
          insertText(`[${selectedText}](`, ')')
        } else {
          insertText('[Link text](', ')')
        }
      },
      shortcut: 'Ctrl+K'
    },
    {
      id: 'list',
      label: 'Bullet List',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
      action: () => insertText('- ', ''),
      shortcut: 'Ctrl+L'
    },
    {
      id: 'quote',
      label: 'Quote',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>,
      action: () => insertText('> ', ''),
      shortcut: 'Ctrl+Q'
    },
    {
      id: 'codeblock',
      label: 'Code Block',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
      action: () => insertText('\\n```\\n', '\\n```\\n'),
      shortcut: 'Ctrl+Shift+C'
    },
    {
      id: 'table',
      label: 'Table',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="21" y2="9"/><line x1="9" y1="15" x2="21" y2="15"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
      action: () => insertText('\\n| Column 1 | Column 2 | Column 3 |\\n|----------|----------|----------|\\n| Cell 1   | Cell 2   | Cell 3   |\\n', ''),
      shortcut: 'Ctrl+T'
    },
    {
      id: 'ai-rewrite',
      label: 'AI Rewrite',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z"/><path d="M9 12l2 2 4-4"/></svg>,
      action: () => handleAIRewrite(),
      shortcut: 'Ctrl+Alt+R'
    }
  ], [wrapText, insertText, content, handleAIRewrite])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const action = toolbarActions.find(action => {
        const shortcut = action.shortcut?.toLowerCase()
        if (!shortcut) return false
        
        const key = e.key.toLowerCase()
        return shortcut.includes(key) || 
               (shortcut.includes('shift') && e.shiftKey && shortcut.includes(key)) ||
               (shortcut === 'ctrl+`' && key === '`')
      })
      
      if (action) {
        e.preventDefault()
        action.action(textareaRef.current!)
      }
      
      // Save shortcut
      if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        onSave?.()
      }
    }
    
    // Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      insertText('    ', '')
    }
  }, [toolbarActions, insertText, onSave])

  const handleToolbarAction = (action: ToolbarAction) => {
    action.action(textareaRef.current!)
  }

  return (
    <div className="markdown-editor">
      {showToolbar && (
        <div className="markdown-editor__toolbar">
          <div className="markdown-editor__toolbar-group">
            {toolbarActions.map((action) => (
              <button
                key={action.id}
                className="markdown-editor__toolbar-button"
                onClick={() => handleToolbarAction(action)}
                title={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
                aria-label={action.label}
              >
                {action.icon}
              </button>
            ))}
          </div>
          
          <div className="markdown-editor__toolbar-group">
            <button
              className="markdown-editor__toolbar-button markdown-editor__toolbar-button--secondary"
              onClick={() => setShowToolbar(false)}
              title="Hide toolbar"
              aria-label="Hide toolbar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            
            {onSave && (
              <button
                className="markdown-editor__toolbar-button markdown-editor__toolbar-button--primary"
                onClick={onSave}
                title="Save (Ctrl+S)"
                aria-label="Save"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17,21 17,13 7,13 7,21"/>
                  <polyline points="7,3 7,8 15,8"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      
      {!showToolbar && (
        <div className="markdown-editor__toolbar-collapsed">
          <button
            className="markdown-editor__toolbar-button markdown-editor__toolbar-button--secondary"
            onClick={() => setShowToolbar(true)}
            title="Show toolbar"
            aria-label="Show toolbar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
        </div>
      )}
      
      <textarea
        ref={textareaRef}
        className="markdown-editor__textarea"
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
      />
      
      <AIRewritePanel
        isOpen={isAIRewriteOpen}
        onClose={() => setIsAIRewriteOpen(false)}
        selectedText={selectedText}
        onRewrite={handleRewriteResult}
      />
    </div>
  )
}

export default MarkdownEditor