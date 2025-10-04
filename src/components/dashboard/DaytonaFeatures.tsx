'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function DaytonaFeatures() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [tweetIdea, setTweetIdea] = useState('')
  const [generatedTweets, setGeneratedTweets] = useState<any[]>([])
  const [selectedVoice, setSelectedVoice] = useState('viral')

  const generateTweets = async () => {
    if (!user || !tweetIdea.trim()) return
    
    setLoading(true)
    setError('')
    setGeneratedTweets([])
    setStatus('🏗️ Creating AI sandbox...')
    
    try {
      const token = await user.getIdToken()
      
      // Simulate progressive status updates
      setTimeout(() => setStatus('🤖 Warming up AI models...'), 1000)
      setTimeout(() => setStatus('✍️ Generating tweet variations...'), 2000)
      setTimeout(() => setStatus('📊 Analyzing viral potential...'), 4000)
      
      const response = await fetch('/api/daytona/generate-tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          idea: tweetIdea,
          variations: 10,
          voice: selectedVoice
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.tweets) {
        setGeneratedTweets(data.tweets)
        setStatus(`✅ Generated ${data.tweets.length} optimized tweets!`)
      } else {
        setError(data.error || 'Failed to generate tweets')
        setStatus('')
      }
    } catch (err: any) {
      setError(err.message)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  const analyzeContent = async () => {
    if (!user || !tweetIdea.trim()) return
    
    setLoading(true)
    setError('')
    setStatus('🏗️ Creating analysis sandbox...')
    
    try {
      const token = await user.getIdToken()
      
      setTimeout(() => setStatus('🔍 Running viral prediction models...'), 1000)
      setTimeout(() => setStatus('📈 Calculating engagement scores...'), 2500)
      
      const response = await fetch('/api/daytona/analyze-virality', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: tweetIdea })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setStatus(`✅ Viral Score: ${data.viralScore}/100 | Est. Reach: ${data.estimatedReach}`)
      } else {
        setError(data.error || 'Failed to analyze content')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative bg-black border border-gray-800 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent animate-shimmer" 
             style={{ 
               backgroundSize: '200% 100%',
               animation: 'shimmer 8s linear infinite'
             }} 
        />
      </div>

      <div className="relative p-6">
        <div className="flex items-start gap-4 mb-6">
          {/* Sharp Icon */}
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-medium mb-1 flex items-center gap-2">
              Content Generator
              <span className="text-xs px-2 py-0.5 bg-purple-600 text-white border border-purple-500">
                POWERED BY DAYTONA
              </span>
            </h3>
            <p className="text-sm text-gray-400">
              Generate high-performing posts using advanced language models in isolated cloud sandboxes
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>

      {/* Input Section */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          What do you want to tweet about?
        </label>
        <textarea
          value={tweetIdea}
          onChange={(e) => setTweetIdea(e.target.value)}
          placeholder="e.g., 'The future of AI in social media marketing' or 'Why developer tools are eating the world'"
          className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none"
          rows={3}
          disabled={loading}
        />
      </div>

      {/* Voice Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Voice Style
        </label>
        <div className="grid grid-cols-5 gap-2">
          {[
            { id: 'viral', label: '🔥 Viral', desc: 'Hot takes & controversy' },
            { id: 'founder', label: '🚀 Founder', desc: 'Raw startup truths' },
            { id: 'shitpost', label: '😂 Shitpost', desc: 'Meme-worthy chaos' },
            { id: 'thread', label: '🧵 Thread', desc: 'Hook + value promise' },
            { id: 'data', label: '📊 Data', desc: 'Numbers that shock' }
          ].map((voice) => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              disabled={loading}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedVoice === voice.id
                  ? 'bg-purple-500 text-white border-2 border-purple-400'
                  : 'bg-black/40 text-gray-400 border border-gray-700 hover:border-purple-500/50'
              } disabled:opacity-50`}
            >
              <div className="font-semibold">{voice.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{voice.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Status Messages */}
      {status && !error && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/30 text-blue-300 px-4 py-3 rounded-lg text-sm">
          {status}
        </div>
      )}
      
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <button
          onClick={generateTweets}
          disabled={loading || !tweetIdea.trim()}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : '✨ Generate 10 Tweet Variations'}
        </button>
        
        <button
          onClick={analyzeContent}
          disabled={loading || !tweetIdea.trim()}
          className="px-6 py-3 bg-black/60 border border-purple-500/50 hover:bg-purple-500/10 disabled:border-gray-700 text-purple-300 disabled:text-gray-500 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : '📊 Predict Viral Score'}
        </button>
      </div>

      {/* Generated Tweets Display */}
      {generatedTweets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              {generatedTweets.length} Bangers Generated
            </h4>
            <span className="text-xs text-gray-500">
              Fetched viral patterns from X API ✓
            </span>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {generatedTweets.map((tweet, idx) => (
              <div key={idx} className="bg-black/60 border border-gray-700 hover:border-purple-500/50 rounded-lg p-4 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-purple-400">#{idx + 1}</span>
                    <span className="text-xs px-2 py-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 rounded border border-purple-500/30">
                      🔥 {tweet.viralScore}/100
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Est. reach</div>
                    <div className="text-sm font-semibold text-blue-400">{tweet.estimatedReach}</div>
                  </div>
                </div>
                
                <p className="text-base text-gray-100 mb-3 leading-relaxed whitespace-pre-wrap">{tweet.text}</p>
                
                {tweet.why && (
                  <div className="mb-3 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded text-xs text-purple-300">
                    💡 <span className="font-semibold">Why it works:</span> {tweet.why}
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span className="px-2 py-1 bg-black/40 rounded">💭 {tweet.tone}</span>
                  <span className="px-2 py-1 bg-black/40 rounded">📏 {tweet.text.length} chars</span>
                  <span className="px-2 py-1 bg-black/40 rounded">{tweet.sentiment}</span>
                </div>
                
                {tweet.hooks && tweet.hooks.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {tweet.hooks.map((hook: string, hidx: number) => (
                      <span key={hidx} className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                        {hook}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(tweet.text)
                      alert('Copied to clipboard!')
                    }}
                    className="flex-1 px-3 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 rounded text-xs font-medium transition-all"
                  >
                    📋 Copy Tweet
                  </button>
                  <button 
                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet.text)}`, '_blank')}
                    className="flex-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 rounded text-xs font-medium transition-all"
                  >
                    🐦 Post Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-black/40 border border-gray-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-gray-400 space-y-1">
            <p><strong className="text-gray-300">How it works:</strong> Daytona spins up isolated AI sandboxes to run multiple language models in parallel, generating and analyzing tweet variations.</p>
            <p><strong className="text-gray-300">Why it's unique:</strong> Get AI-optimized tweets tested for viral potential before you post them.</p>
            <p><strong className="text-gray-300">Processing time:</strong> 5-10 seconds for generation + analysis.</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
