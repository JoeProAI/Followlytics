'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

interface FollowerDetailModalProps {
  follower: any
  onClose: () => void
  targetUsername?: string
}

export default function FollowerDetailModal({ follower, onClose, targetUsername }: FollowerDetailModalProps) {
  const { user } = useAuth()
  const [generatingGamma, setGeneratingGamma] = useState(false)
  const [gammaPrompt, setGammaPrompt] = useState('Analyze this user\'s influence and engagement potential')
  const [showPromptInput, setShowPromptInput] = useState(false)
  
  const generateGamma = async () => {
    if (!user) return
    
    setGeneratingGamma(true)
    try {
      const token = await user.getIdToken()
      
      const response = await fetch('/api/gamma/generate-follower', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: follower.username,
          targetUsername: targetUsername || follower.username,
          customPrompt: gammaPrompt
        })
      })
      
      if (response.ok) {
        alert(`✅ Gamma report queued for @${follower.username}!\n\nPrompt: "${gammaPrompt}"\n\n⏰ This will take a few minutes to generate.\nCheck the AI Analysis page when done!`)
        onClose()
      } else {
        const error = await response.json()
        alert(`❌ Failed to generate Gamma: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Gamma generation error:', err)
      alert('❌ Failed to generate Gamma report')
    } finally {
      setGeneratingGamma(false)
    }
  }
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  
  const formatNumber = (num: number) => {
    if (!num) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#15191e] border-2 border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-3">
            {follower.profileImage && (
              <img 
                src={follower.profileImage} 
                alt={follower.name}
                className="w-16 h-16 rounded-full border-2 border-white/50"
              />
            )}
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {follower.name || follower.username}
                {follower.verified && (
                  <span className="text-blue-400" title="Verified">✓</span>
                )}
              </h2>
              <a 
                href={`https://x.com/${follower.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-200 hover:text-white font-mono transition-colors"
              >
                @{follower.username} ↗
              </a>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          >
            ×
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{formatNumber(follower.followersCount || 0)}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Followers</div>
            </div>
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{follower.verified ? 'Yes' : 'No'}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Verified</div>
            </div>
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {follower.followersCount >= 100000 ? 'Macro' :
                 follower.followersCount >= 10000 ? 'Micro' :
                 follower.followersCount >= 1000 ? 'Nano' : 'Regular'}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Influencer</div>
            </div>
          </div>
          
          {/* Bio */}
          {follower.bio && (
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Bio</h3>
              <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{follower.bio}</p>
            </div>
          )}
          
          {/* Location */}
          {follower.location && (
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">📍 Location</h3>
              <p className="text-gray-200">{follower.location}</p>
            </div>
          )}
          
          {/* Timeline */}
          <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">📅 Timeline</h3>
            <div className="space-y-2">
              {follower.first_seen && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">First Seen:</span>
                  <span className="text-green-400 font-semibold">{formatDate(follower.first_seen)}</span>
                </div>
              )}
              {follower.extracted_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Last Extracted:</span>
                  <span className="text-blue-400 font-semibold">{formatDate(follower.extracted_at)}</span>
                </div>
              )}
              {follower.last_seen && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Last Seen:</span>
                  <span className="text-purple-400 font-semibold">{formatDate(follower.last_seen)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center justify-center gap-2">
            <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              follower.status === 'active' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {follower.status === 'active' ? '✓ Following You' : '⚠️ Unfollowed'}
            </div>
          </div>
        </div>
        
        {/* Custom Prompt Section */}
        <div className="px-6 pb-4">
          <button
            onClick={() => setShowPromptInput(!showPromptInput)}
            className="text-sm text-blue-400 hover:text-blue-300 underline mb-2"
          >
            {showPromptInput ? '↑ Hide' : '✏️ Customize Gamma Prompt'}
          </button>
          
          {showPromptInput && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  What should the Gamma analyze?
                </label>
                <textarea
                  value={gammaPrompt}
                  onChange={(e) => setGammaPrompt(e.target.value)}
                  placeholder="e.g., How cool is this user? What business opportunities exist?"
                  className="w-full px-4 py-3 bg-[#0f1419] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
              
              {/* Quick Prompt Templates */}
              <div>
                <div className="text-xs text-gray-500 mb-2">Quick templates:</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGammaPrompt('How cool and influential is this user?')}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition-colors"
                  >
                    😎 Coolness Factor
                  </button>
                  <button
                    onClick={() => setGammaPrompt('What business or collaboration opportunities exist with this user?')}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition-colors"
                  >
                    💼 Business Potential
                  </button>
                  <button
                    onClick={() => setGammaPrompt('Analyze this user\'s engagement style and audience demographics')}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition-colors"
                  >
                    📊 Audience Analysis
                  </button>
                  <button
                    onClick={() => setGammaPrompt('Is this user a potential brand partner or influencer?')}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition-colors"
                  >
                    🤝 Partnership Fit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-[#0f1419] border-t border-gray-800 px-6 py-4 flex items-center gap-3">
          <a
            href={`https://x.com/${follower.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-center text-sm font-bold text-white transition-colors"
          >
            View Profile on X ↗
          </a>
          <button
            onClick={generateGamma}
            disabled={generatingGamma}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-center text-sm font-bold text-white transition-colors"
          >
            {generatingGamma ? '⏳ Generating...' : '🎨 Generate Gamma Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
