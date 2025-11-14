'use client'

import { useState } from 'react'
import { auth } from '@/lib/firebase'

interface GammaResult {
  gammaId: string
  status: string
  urls?: {
    view: string
    pdf?: string
    pptx?: string
  }
}

export default function GammaGenerator({ username }: { username?: string }) {
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState<'presentation' | 'document' | 'webpage'>('presentation')
  const [tone, setTone] = useState('professional')
  const [audience, setAudience] = useState('')
  const [imageModel, setImageModel] = useState('dalle3')
  const [includeData, setIncludeData] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GammaResult | null>(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('Please log in first')
      }

      const token = await user.getIdToken()

      // Generate
      const res = await fetch('/api/gamma/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          username,
          type,
          tone,
          audience: audience || undefined,
          includeFollowerData: includeData,
          imageModel
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.details || 'Generation failed')
      }

      const data = await res.json()
      
      // Poll for completion
      const pollStatus = async (gammaId: string) => {
        const statusRes = await fetch(`/api/gamma/status/${gammaId}`)
        const statusData = await statusRes.json()
        
        if (statusData.status === 'completed') {
          setResult(statusData)
          setLoading(false)
        } else if (statusData.status === 'failed') {
          setError('Generation failed')
          setLoading(false)
        } else {
          // Still processing, check again in 5 seconds
          setTimeout(() => pollStatus(gammaId), 5000)
        }
      }

      pollStatus(data.gammaId)

    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-4xl">🎨</div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gamma AI Presentation Generator</h2>
          <p className="text-gray-600">Create stunning presentations from your follower data</p>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What do you want to create? 🚀
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: Create a presentation analyzing my follower demographics and growth patterns, with insights on my most influential followers and recommendations for audience engagement..."
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Output Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="presentation">📊 Presentation</option>
            <option value="document">📄 Document</option>
            <option value="webpage">🌐 Webpage</option>
          </select>
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="professional">💼 Professional</option>
            <option value="casual">😎 Casual</option>
            <option value="enthusiastic">🎉 Enthusiastic</option>
            <option value="formal">🎩 Formal</option>
          </select>
        </div>

        {/* Image Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Image Quality</label>
          <select
            value={imageModel}
            onChange={(e) => setImageModel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="dalle3">🎨 DALL-E 3 (Best Quality)</option>
            <option value="sdxl">🖼️ Stable Diffusion XL</option>
            <option value="flux">⚡ Flux (Fast)</option>
          </select>
        </div>

        {/* Audience */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience (Optional)</label>
          <input
            type="text"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g., executives, developers, marketers"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Include Follower Data */}
      {username && (
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeData}
              onChange={(e) => setIncludeData(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Include my follower data from <strong>@{username}</strong>
            </span>
          </label>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating Banger...
          </span>
        ) : (
          '🚀 Generate with Gamma AI'
        )}
      </button>

      {/* Result */}
      {result && result.urls && (
        <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">✨ Your Banger is Ready!</h3>
          
          <div className="space-y-3">
            <a
              href={result.urls.view}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold text-center hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              👀 View Presentation
            </a>
            
            {result.urls.pdf && (
              <a
                href={result.urls.pdf}
                className="block w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold text-center hover:bg-gray-50 transition-all"
              >
                📄 Download PDF
              </a>
            )}
            
            {result.urls.pptx && (
              <a
                href={result.urls.pptx}
                className="block w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold text-center hover:bg-gray-50 transition-all"
              >
                📊 Download PowerPoint
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
