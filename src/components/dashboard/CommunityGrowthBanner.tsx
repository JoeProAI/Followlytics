'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CommunityGrowthData {
  joeproFollowers: number
  currentTier: {
    followers: number
    limit: number
    label: string
  }
  nextTier: {
    followers: number
    limit: number
    label: string
  } | null
  progress: number
  message: string
}

interface Props {
  userTier?: string
}

export default function CommunityGrowthBanner({ userTier = 'free' }: Props) {
  const [data, setData] = useState<CommunityGrowthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    loadCommunityData()
  }, [])

  // Check if banner was dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('community_banner_dismissed')
    if (dismissed === 'true') {
      setDismissed(true)
    }
  }, [])

  async function loadCommunityData() {
    try {
      const response = await fetch('/api/community/growth')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (err) {
      console.error('Failed to load community growth data:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem('community_banner_dismissed', 'true')
  }

  // Don't show for paid users
  if (userTier !== 'free' && userTier !== 'beta') {
    return null
  }

  // Don't show if dismissed
  if (dismissed) {
    return null
  }

  // Don't show while loading
  if (loading || !data) {
    return null
  }

  const { currentTier, nextTier, progress, joeproFollowers } = data
  const remaining = nextTier ? nextTier.followers - joeproFollowers : 0

  return (
    <div className="relative bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border border-purple-500/20 rounded-lg p-6 mb-6 overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-300 transition-colors"
        title="Dismiss (you can still export up to the current limit)"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative flex items-start gap-4">
        <div className="text-5xl">🌱</div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Community Growth Unlocks
          </h3>
          
          <p className="text-sm text-gray-300 mb-4">
            As <a 
              href={`https://x.com/JoeProAI`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              @JoeProAI
            </a> grows, your export limits grow too! We're building this together.
          </p>

          {/* Current Status */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20">
              <div className="text-2xl font-bold text-purple-400">
                {currentTier.limit.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">Current Export Limit</div>
              <div className="text-xs text-gray-500 mt-1">{currentTier.label}</div>
            </div>
            
            {nextTier && (
              <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-400">
                  {nextTier.limit.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1">Next Unlock</div>
                <div className="text-xs text-gray-500 mt-1">{nextTier.label}</div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {nextTier && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>{joeproFollowers.toLocaleString()} followers</span>
                <span className="text-purple-400 font-medium">
                  {remaining.toLocaleString()} to go!
                </span>
                <span>{nextTier.followers.toLocaleString()} target</span>
              </div>
              <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden border border-gray-700">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <div className="text-center mt-2 text-xs text-gray-400">
                {progress}% to next unlock
              </div>
            </div>
          )}

          {!nextTier && (
            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-purple-300 font-medium">
                🎉 Maximum tier unlocked! You have access to the highest community export limit.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <a 
              href="https://x.com/JoeProAI" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
            >
              Follow @JoeProAI
            </a>
            
            <Link 
              href="/pricing"
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-700"
            >
              Or Upgrade for Unlimited
            </Link>

            <button
              onClick={handleDismiss}
              className="px-5 py-2.5 text-gray-400 hover:text-gray-300 text-sm font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>

          {/* Small Print */}
          <p className="text-xs text-gray-500 mt-4">
            💡 Following @JoeProAI supports our growth and helps unlock features for the entire community. 
            Export limits update automatically as we hit milestones.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}
