'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface Analysis {
  id: string
  target_username: string
  follower_count: number
  created_at: string
  analysis: {
    audienceComposition: {
      types: string[]
      summary: string
    }
    influenceLevel: {
      score: number
      summary: string
    }
    keyInfluencers: Array<{
      username: string
      reason: string
    }>
    industryPatterns: {
      themes: string[]
      summary: string
    }
    engagementPotential: {
      score: number
      highPotential: string[]
      summary: string
    }
    recommendations: string[]
    redFlags: {
      concerns: string[]
      summary: string
    }
    overallScore: number
    summary: string
  }
}

export default function FollowerAnalysisResults() {
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)

  useEffect(() => {
    if (user) {
      loadAnalyses()
    }
  }, [user])

  async function loadAnalyses() {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/ai/analyze-followers', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalyses(data.analyses || [])
        if (data.analyses && data.analyses.length > 0) {
          setSelectedAnalysis(data.analyses[0])
        }
      }
    } catch (error) {
      console.error('Failed to load analyses:', error)
    } finally {
      setLoading(false)
    }
  }

  function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  function getScoreLabel(score: number) {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Average'
    return 'Needs Improvement'
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-800 rounded w-1/3"></div>
          <div className="h-4 bg-gray-800 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🤖</div>
        <h3 className="text-xl font-medium mb-2">No AI Analyses Yet</h3>
        <p className="text-gray-400 text-sm">
          After extracting followers, click "Analyze Top 50" to get AI-powered insights about your audience.
        </p>
      </div>
    )
  }

  if (!selectedAnalysis) return null

  const { analysis } = selectedAnalysis

  return (
    <div className="space-y-6">
      {/* Analysis Selector */}
      {analyses.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">Your AI Analyses:</div>
          <div className="flex gap-2 flex-wrap">
            {analyses.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAnalysis(a)}
                className={`
                  px-4 py-2 rounded-lg text-sm transition-all
                  ${selectedAnalysis.id === a.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }
                `}
              >
                {a.target_username ? `@${a.target_username}` : 'Analysis'}
                <span className="ml-2 text-xs opacity-75">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overall Score */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">🤖 AI Follower Analysis</h2>
            <p className="text-sm text-gray-400">
              Analyzed {selectedAnalysis.follower_count} followers
              {selectedAnalysis.target_username && ` for @${selectedAnalysis.target_username}`}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getScoreColor(analysis.overallScore)}`}>
              {analysis.overallScore}
            </div>
            <div className="text-sm text-gray-400">{getScoreLabel(analysis.overallScore)}</div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">📊 Executive Summary</h3>
        <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audience Composition */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>👥</span> Audience Composition
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {analysis.audienceComposition.types.map((type, i) => (
              <span key={i} className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-400">
                {type}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-400">{analysis.audienceComposition.summary}</p>
        </div>

        {/* Influence Level */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>⭐</span> Influence Level
          </h3>
          <div className="mb-3">
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-bold ${getScoreColor(analysis.influenceLevel.score * 10)}`}>
                {analysis.influenceLevel.score}/10
              </div>
              <div className="flex-1">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    style={{ width: `${analysis.influenceLevel.score * 10}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-400">{analysis.influenceLevel.summary}</p>
        </div>
      </div>

      {/* Key Influencers */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🌟</span> Key Influencers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysis.keyInfluencers.map((influencer, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="font-medium text-blue-400 mb-2">@{influencer.username}</div>
              <p className="text-xs text-gray-400">{influencer.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Industry Patterns */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>🎯</span> Industry Patterns
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {analysis.industryPatterns.themes.map((theme, i) => (
            <span key={i} className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-sm text-green-400">
              {theme}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-400">{analysis.industryPatterns.summary}</p>
      </div>

      {/* Engagement Potential */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>🚀</span> Engagement Potential
        </h3>
        <div className="mb-3">
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-bold ${getScoreColor(analysis.engagementPotential.score * 10)}`}>
              {analysis.engagementPotential.score}/10
            </div>
            <div className="flex-1">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-cyan-500"
                  style={{ width: `${analysis.engagementPotential.score * 10}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-400 mb-3">{analysis.engagementPotential.summary}</p>
        {analysis.engagementPotential.highPotential.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-2">High Engagement Potential:</div>
            <div className="flex flex-wrap gap-2">
              {analysis.engagementPotential.highPotential.map((username, i) => (
                <span key={i} className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-xs text-cyan-400">
                  @{username}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>💡</span> Strategic Recommendations
        </h3>
        <ul className="space-y-3">
          {analysis.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <span className="text-gray-300">{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Red Flags */}
      {analysis.redFlags.concerns.length > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>⚠️</span> Red Flags
          </h3>
          <ul className="space-y-3 mb-3">
            {analysis.redFlags.concerns.map((concern, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-red-400 mt-1">!</span>
                <span className="text-gray-300">{concern}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-400">{analysis.redFlags.summary}</p>
        </div>
      )}

      {/* Analysis Metadata */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <div>
            Analysis Date: {new Date(selectedAnalysis.created_at).toLocaleString()}
          </div>
          <div>
            Model: GPT-4o
          </div>
        </div>
      </div>
    </div>
  )
}
