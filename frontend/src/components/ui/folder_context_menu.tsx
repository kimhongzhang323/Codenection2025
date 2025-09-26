import React, { useEffect, useRef } from 'react'
import './context_menu.css'
import { SquarePenIcon } from '../icons/new_note_icon'
import { FoldersIcon } from '../icons/new_folder_icon'
import { PenToolIcon } from '../icons/rename_icon'
import { DeleteIcon } from '../icons/delete_icon'

interface FolderContextMenuProps {
  isVisible: boolean
  x: number
  y: number
  onClose: () => void
  onNewNote: () => void
  onNewFolder: () => void
  onRename: () => void
  onDelete: () => void
}

const FolderContextMenu: React.FC<FolderContextMenuProps> = ({ 
  isVisible, 
  x, 
  y, 
  onClose, 
  onNewNote, 
  onNewFolder, 
  onRename, 
  onDelete 
}) => {
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
      <div className="context-menu__item" onClick={onNewNote}>
        <SquarePenIcon size={16} />
        New note
      </div>
      
      <div className="context-menu__item" onClick={onNewFolder}>
        <FoldersIcon size={16} />
        New folder
      </div>
      
      <div className="context-menu__separator" />
      
      <div className="context-menu__item" onClick={onRename}>
        <PenToolIcon size={16} />
        Rename
      </div>
      
      <div className="context-menu__item context-menu__item--danger" onClick={onDelete}>
        <DeleteIcon size={16} />
        Delete
      </div>
    </div>
  )
}

export default FolderContextMenu
