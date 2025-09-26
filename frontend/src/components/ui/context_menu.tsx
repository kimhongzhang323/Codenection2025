import React, { useEffect, useRef } from 'react'
import './context_menu.css'
import { UploadIcon } from '../icons/upload_icon'

interface ContextMenuProps {
  isVisible: boolean
  x: number
  y: number
  onClose: () => void
  onUpload: () => void
}

const ContextMenu: React.FC<ContextMenuProps> = ({ isVisible, x, y, onClose, onUpload }) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000
      }}
    >
      <div className="context-menu__item" onClick={onUpload}>
        <UploadIcon size={14} />
        Upload from local
      </div>
    </div>
  )
}

export default ContextMenu
