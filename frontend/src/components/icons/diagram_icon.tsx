import React from 'react'

interface DiagramIconProps {
  size?: number
  className?: string
}

export const DiagramIcon: React.FC<DiagramIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="3" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="15" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="3" y="17" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="15" y="17" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="9" y="10" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M9 7L9 10" stroke="currentColor" strokeWidth="2"/>
      <path d="M15 7L15 10" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 14L12 17" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 19L9 17" stroke="currentColor" strokeWidth="2"/>
      <path d="M15 19L15 17" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}
