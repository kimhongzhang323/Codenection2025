import { useState, useEffect, useCallback } from 'react'

interface SelectionState {
  isVisible: boolean
  position: { x: number; y: number }
  selectedText: string
  placement: 'top' | 'bottom'
}

export const useTextSelection = () => {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    selectedText: '',
    placement: 'bottom'
  })

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection()
    
    if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
      setSelectionState(prev => ({ ...prev, isVisible: false }))
      return
    }

    const range = selection.getRangeAt(0)

    // Only allow selection that originates within the docs main content area
    const ancestor = range.commonAncestorContainer
    const ancestorElement = (ancestor as Node).nodeType === Node.ELEMENT_NODE
      ? (ancestor as Element)
      : (ancestor as Node).parentElement

    const isInDocsContent = ancestorElement?.closest('.docs-main__container') !== null
    const isInSidebar = ancestorElement?.closest('.docs-sidebar') !== null
    const isInToc = ancestorElement?.closest('.toc-container') !== null

    if (!isInDocsContent || isInSidebar || isInToc) {
      // Ignore selections outside the documentation content area
      setSelectionState(prev => ({ ...prev, isVisible: false }))
      return
    }
    const rect = range.getBoundingClientRect()
    
    // Calculate position for the dialog
    const x = rect.left + (rect.width / 2) - 80 // Center the dialog
    
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const estimatedMaxHeight = 350

    let placement: 'top' | 'bottom'
    let y: number

    if (spaceBelow >= estimatedMaxHeight) {
      placement = 'bottom'
      y = rect.bottom + 8
    } else if (spaceAbove >= estimatedMaxHeight) {
      placement = 'top'
      y = rect.top - 8
    } else {
      // Place on the side with more space
      placement = spaceBelow > spaceAbove ? 'bottom' : 'top'
      y = placement === 'bottom' ? rect.bottom + 8 : rect.top - 8
    }

    setSelectionState({
      isVisible: true,
      position: { x, y },
      selectedText: selection.toString().trim(),
      placement
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
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('click', handleClickOutside)

    return () => {
      // Cleanup event listeners
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [handleMouseUp, handleClickOutside])

  return {
    ...selectionState,
    closeDialog
  }
}
