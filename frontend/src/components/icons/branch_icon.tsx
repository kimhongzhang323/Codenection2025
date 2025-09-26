import React from 'react'

interface BranchIconProps {
  className?: string
  style?: React.CSSProperties
}

const BranchIcon: React.FC<BranchIconProps> = ({ className = '', style }) => {
  return (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <line x1="6" y1="3" x2="6" y2="15"></line>
      <circle cx="18" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <path d="m18 9a5 5 0 0 1-5 5 6 6 0 0 1-6-6"></path>
    </svg>
  )
}

export default BranchIcon
