import { useState, useEffect, useCallback } from 'react'

interface SelectionState {
  isVisible: boolean
  position: { x: number; y: number }
  selectedText: string
}

export const useTextSelection = () => {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    selectedText: ''
  })

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection()
    
    if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
      setSelectionState(prev => ({ ...prev, isVisible: false }))
      return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    
    // Calculate position for the dialog (below the selection)
    const x = rect.left + (rect.width / 2) - 80 // Center the dialog
    const y = rect.bottom + 8 // 8px below the selection

    setSelectionState({
      isVisible: true,
      position: { x, y },
      selectedText: selection.toString().trim()
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    // Small delay to ensure selection is complete
    setTimeout(handleSelectionChange, 10)
  }, [handleSelectionChange])

  const handleClickOutside = useCallback((event: MouseEvent) => {
    // Close dialog if clicking outside
    const target = event.target as Element
    if (!target.closest('.highlight-dialog')) {
      setSelectionState(prev => ({ ...prev, isVisible: false }))
    }
  }, [])

  const closeDialog = useCallback(() => {
    setSelectionState(prev => ({ ...prev, isVisible: false }))
  }, [])

  useEffect(() => {
    // Add event listeners
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('click', handleClickOutside)

    return () => {
      // Cleanup event listeners
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [handleSelectionChange, handleMouseUp, handleClickOutside])

  return {
    ...selectionState,
    closeDialog
  }
}
