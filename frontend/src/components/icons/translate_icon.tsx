import React from 'react'

interface TranslateIconProps {
  size?: number
  className?: string
}

export const TranslateIcon: React.FC<TranslateIconProps> = ({ size = 16, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
      <text x="7" y="8" fontSize="6" fill="currentColor">A</text>
      <text x="15" y="16" fontSize="6" fill="currentColor">文</text>
    </svg>
  )
}
