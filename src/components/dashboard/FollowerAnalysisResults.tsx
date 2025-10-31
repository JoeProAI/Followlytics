'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import XFireworksLoader from '@/components/ui/XFireworksLoader'

interface IndividualAnalysis {
  username: string
  name: string
  category: string
  influenceScore: number
  engagementValue: 'HIGH' | 'MEDIUM' | 'LOW'
  strategicValue: string
  actionRecommendation: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

interface Analysis {
  id: string
  target_username: string
  follower_count: number
  created_at: string
  analysis: {
    individualAnalyses?: IndividualAnalysis[]
    aggregateAnalysis?: {
      audienceComposition: {
        types: string[]
        summary: string
      }
      influenceLevel: {
        score: number
        summary: string
      }
      industryPatterns: {
        themes: string[]
        summary: string
      }
      engagementPotential: {
        score: number
        summary: string
      }
      recommendations: string[]
      redFlags: {
        concerns: string[]
        summary: string
      }
    }
    // Legacy fields for backward compatibility
    audienceComposition?: {
      types: string[]
      summary: string
    }
    influenceLevel?: {
      score: number
      summary: string
    }
    keyInfluencers?: Array<{
      username: string
      reason: string
    }>
    industryPatterns?: {
      themes: string[]
      summary: string
    }
    engagementPotential?: {
      score: number
      highPotential: string[]
      summary: string
    }
    recommendations?: string[]
    redFlags?: {
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
        <XFireworksLoader message="Loading AI analysis..." size="md" />
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

      {/* Individual Follower Analyses */}
      {analysis.individualAnalyses && analysis.individualAnalyses.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>👥</span> Individual Follower Analysis ({analysis.individualAnalyses.length})
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            Detailed AI analysis for each selected follower with actionable recommendations.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.individualAnalyses.map((follower, i) => {
              const priorityColors = {
                HIGH: 'border-red-500/50 bg-red-500/10',
                MEDIUM: 'border-yellow-500/50 bg-yellow-500/10',
                LOW: 'border-gray-500/50 bg-gray-500/10'
              }
              
              const engagementColors = {
                HIGH: 'text-green-400 bg-green-500/20 border-green-500/30',
                MEDIUM: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
                LOW: 'text-gray-400 bg-gray-500/20 border-gray-500/30'
              }
              
              return (
                <div
                  key={i}
                  className={`border-2 rounded-lg p-4 ${priorityColors[follower.priority] || priorityColors.MEDIUM}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-white mb-1">
                        {follower.name || follower.username}
                      </div>
                      <div className="text-xs text-gray-400">@{follower.username}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(follower.influenceScore * 10)}`}>
                        {follower.influenceScore}/10
                      </div>
                    </div>
                  </div>
                  
                  {/* Category */}
                  <div className="mb-3">
                    <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-400">
                      {follower.category}
                    </span>
                  </div>
                  
                  {/* Priority & Engagement */}
                  <div className="flex gap-2 mb-3">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-800 text-gray-300">
                      {follower.priority} Priority
                    </span>
                    <span className={`px-2 py-1 border rounded text-xs font-medium ${engagementColors[follower.engagementValue]}`}>
                      {follower.engagementValue} Engagement
                    </span>
                  </div>
                  
                  {/* Strategic Value */}
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Why they matter:</div>
                    <p className="text-xs text-gray-300">{follower.strategicValue}</p>
                  </div>
                  
                  {/* Action Recommendation */}
                  <div className="pt-3 border-t border-gray-700">
                    <div className="text-xs text-gray-500 mb-1">✨ Action:</div>
                    <p className="text-xs text-cyan-400">{follower.actionRecommendation}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Aggregate Analysis */}
      {analysis.aggregateAnalysis && (
        <>
          <div className="text-lg font-semibold text-gray-400 mb-2">
            📊 Aggregate Insights
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audience Composition */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>👥</span> Audience Composition
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {analysis.aggregateAnalysis.audienceComposition.types.map((type, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-400">
                    {type}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-400">{analysis.aggregateAnalysis.audienceComposition.summary}</p>
            </div>

            {/* Influence Level */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>⭐</span> Influence Level
              </h3>
              <div className="mb-3">
                <div className="flex items-center gap-3">
                  <div className={`text-3xl font-bold ${getScoreColor(analysis.aggregateAnalysis.influenceLevel.score * 10)}`}>
                    {analysis.aggregateAnalysis.influenceLevel.score}/10
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        style={{ width: `${analysis.aggregateAnalysis.influenceLevel.score * 10}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400">{analysis.aggregateAnalysis.influenceLevel.summary}</p>
            </div>
          </div>

          {/* Industry Patterns */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>🎯</span> Industry Patterns
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {analysis.aggregateAnalysis.industryPatterns.themes.map((theme, i) => (
                <span key={i} className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-sm text-green-400">
                  {theme}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-400">{analysis.aggregateAnalysis.industryPatterns.summary}</p>
          </div>

          {/* Engagement Potential */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>🚀</span> Engagement Potential
            </h3>
            <div className="mb-3">
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-bold ${getScoreColor(analysis.aggregateAnalysis.engagementPotential.score * 10)}`}>
                  {analysis.aggregateAnalysis.engagementPotential.score}/10
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-cyan-500"
                      style={{ width: `${analysis.aggregateAnalysis.engagementPotential.score * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400">{analysis.aggregateAnalysis.engagementPotential.summary}</p>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>💡</span> Strategic Recommendations
            </h3>
            <ul className="space-y-3">
              {analysis.aggregateAnalysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <span className="text-gray-300">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Red Flags */}
          {analysis.aggregateAnalysis.redFlags && analysis.aggregateAnalysis.redFlags.concerns.length > 0 && (
            <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>⚠️</span> Red Flags
              </h3>
              <ul className="space-y-3 mb-3">
                {analysis.aggregateAnalysis.redFlags.concerns.map((concern, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">!</span>
                    <span className="text-gray-300">{concern}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-400">{analysis.aggregateAnalysis.redFlags.summary}</p>
            </div>
          )}
        </>
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
