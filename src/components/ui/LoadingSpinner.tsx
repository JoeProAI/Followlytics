"use client"

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

export default function LoadingSpinner({ size = 'md', text, fullScreen = false }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const spinner = (
    <div className="relative">
      {/* Outer rotating square */}
      <div className={`${sizeClasses[size]} border-2 border-gray-800 absolute animate-spin`} style={{animationDuration: '3s'}} />
      
      {/* Middle rotating square */}
      <div className={`${sizeClasses[size]} border-2 border-t-white border-r-white border-b-transparent border-l-transparent absolute animate-spin`} style={{animationDuration: '1.5s'}} />
      
      {/* Inner rotating square */}
      <div className={`${sizeClasses[size]} border-2 border-white absolute animate-spin`} style={{animationDuration: '0.75s', transform: 'scale(0.5)'}} />
      
      {/* Center pulse dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white animate-pulse" />
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        {spinner}
        {text && (
          <p className="mt-8 text-gray-400 text-sm tracking-widest uppercase animate-pulse">
            {text}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {spinner}
      {text && (
        <p className="mt-4 text-gray-400 text-sm tracking-widest uppercase">
          {text}
        </p>
      )}
    </div>
  )
}

