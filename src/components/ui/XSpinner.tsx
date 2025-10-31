'use client'

interface XSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function XSpinner({ size = 'md', className = '' }: XSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className={`relative inline-block ${sizeClasses[size]} ${className}`}>
      {/* Multiple rotating X's to create firework effect */}
      <span 
        className="absolute inset-0 flex items-center justify-center text-blue-400 font-bold animate-spin"
        style={{ animationDuration: '0.8s' }}
      >
        𝕏
      </span>
      <span 
        className="absolute inset-0 flex items-center justify-center text-blue-500 font-bold animate-spin"
        style={{ animationDuration: '0.6s', animationDirection: 'reverse' }}
      >
        𝕏
      </span>
      <span 
        className="absolute inset-0 flex items-center justify-center text-blue-300 font-bold animate-ping"
      >
        𝕏
      </span>
    </div>
  )
}
