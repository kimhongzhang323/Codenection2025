import React from 'react'

interface HistoryIconProps {
  size?: number
  className?: string
  color?: string
}

export const HistoryIcon: React.FC<HistoryIconProps> = ({ 
  size = 16, 
  className = '', 
  color = 'currentColor' 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="m12 7 0 5 4 0" />
    </svg>
  )
}

export default HistoryIcon
