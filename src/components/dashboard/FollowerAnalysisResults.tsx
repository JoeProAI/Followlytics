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
  const [aiUsage, setAiUsage] = useState<any>(null)
  const [generatingGamma, setGeneratingGamma] = useState(false)
  const [gammaReport, setGammaReport] = useState<any>(null)
  const [pollingGamma, setPollingGamma] = useState(false)
  const [generatingFollowerGamma, setGeneratingFollowerGamma] = useState<Set<string>>(new Set())
  const [followerGammaReports, setFollowerGammaReports] = useState<Record<string, any>>({})
  const [deletingAnalysis, setDeletingAnalysis] = useState(false)

  useEffect(() => {
    if (user) {
      loadAnalyses()
      loadAiUsage()
    }
  }, [user])

  useEffect(() => {
    if (selectedAnalysis) {
      checkGammaReport()
    }
  }, [selectedAnalysis])

  async function loadAiUsage() {
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/ai/usage', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAiUsage(data.usage)
      }
    } catch (error) {
      console.error('Failed to load AI usage:', error)
    }
  }

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

  async function checkGammaReport() {
    if (!selectedAnalysis || !user) return
    
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/gamma/status?analysisId=${selectedAnalysis.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.gammaReport) {
          setGammaReport(data.gammaReport)
        }
      }
    } catch (error) {
      console.error('Failed to check Gamma report:', error)
    }
  }

  async function pollGammaStatus(generationId: string) {
    setPollingGamma(true)
    let attempts = 0
    const maxAttempts = 30 // Poll for up to 5 minutes (10 seconds * 30)
    
    const poll = async () => {
      attempts++
      
      try {
        const token = await user?.getIdToken()
        const response = await fetch(`/api/gamma/status?analysisId=${selectedAnalysis?.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.gammaReport?.status === 'completed' && data.gammaReport?.url) {
            setGammaReport(data.gammaReport)
            setPollingGamma(false)
            return
          } else if (data.gammaReport?.status === 'failed') {
            alert('Gamma report generation failed. Please try again.')
            setPollingGamma(false)
            return
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
      
      if (attempts < maxAttempts) {
        setTimeout(poll, 10000) // Poll every 10 seconds
      } else {
        setPollingGamma(false)
        alert('Gamma report is still generating. Please check back in a few minutes.')
      }
    }
    
    setTimeout(poll, 10000) // Start polling after 10 seconds
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

  function exportAsJSON() {
    if (!selectedAnalysis) return
    
    const dataStr = JSON.stringify(selectedAnalysis, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `follower-analysis-${selectedAnalysis.target_username || 'results'}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function exportAsCSV() {
    if (!selectedAnalysis) return
    
    const { analysis } = selectedAnalysis
    
    // Export individual analyses as CSV
    if (analysis.individualAnalyses && analysis.individualAnalyses.length > 0) {
      const headers = ['Username', 'Name', 'Category', 'Influence Score', 'Engagement Value', 'Priority', 'Strategic Value', 'Action Recommendation']
      const rows = analysis.individualAnalyses.map(f => [
        f.username,
        f.name,
        f.category,
        f.influenceScore,
        f.engagementValue,
        f.priority,
        `"${f.strategicValue.replace(/"/g, '""')}"`,
        `"${f.actionRecommendation.replace(/"/g, '""')}"`
      ])
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `follower-analysis-${selectedAnalysis.target_username || 'results'}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  async function deleteAnalysis(analysisId: string) {
    if (!user || !confirm('Delete this analysis? This cannot be undone.')) return
    
    setDeletingAnalysis(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/ai/analyze-followers/${analysisId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        // Remove from local state
        setAnalyses(analyses.filter(a => a.id !== analysisId))
        if (selectedAnalysis?.id === analysisId) {
          setSelectedAnalysis(analyses[0] || null)
        }
        alert('✅ Analysis deleted successfully')
      } else {
        throw new Error('Failed to delete analysis')
      }
    } catch (error: any) {
      console.error('Delete failed:', error)
      alert('❌ Failed to delete analysis: ' + error.message)
    } finally {
      setDeletingAnalysis(false)
    }
  }

  async function generateFollowerGamma(followerUsername: string, followerData: IndividualAnalysis) {
    if (!user) return
    
    setGeneratingFollowerGamma(prev => new Set(prev).add(followerUsername))
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/gamma/generate-follower', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          follower: followerData,
          analysisId: selectedAnalysis?.id
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate follower Gamma')
      }
      
      const data = await response.json()
      
      // Poll for completion
      pollFollowerGamma(followerUsername, data.generationId)
    } catch (error: any) {
      console.error('Follower Gamma generation failed:', error)
      alert('❌ Failed to generate Gamma: ' + error.message)
      setGeneratingFollowerGamma(prev => {
        const newSet = new Set(prev)
        newSet.delete(followerUsername)
        return newSet
      })
    }
  }

  async function pollFollowerGamma(followerUsername: string, generationId: string) {
    let attempts = 0
    const maxAttempts = 30
    
    const poll = async () => {
      attempts++
      
      try {
        const token = await user?.getIdToken()
        const response = await fetch(`/api/gamma/status?generationId=${generationId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.gammaReport?.status === 'completed' && data.gammaReport?.url) {
            setFollowerGammaReports(prev => ({
              ...prev,
              [followerUsername]: data.gammaReport
            }))
            setGeneratingFollowerGamma(prev => {
              const newSet = new Set(prev)
              newSet.delete(followerUsername)
              return newSet
            })
            return
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
      
      if (attempts < maxAttempts) {
        setTimeout(poll, 10000)
      } else {
        setGeneratingFollowerGamma(prev => {
          const newSet = new Set(prev)
          newSet.delete(followerUsername)
          return newSet
        })
        alert('⏱️ Gamma generation timed out. Please check back later.')
      }
    }
    
    setTimeout(poll, 10000)
  }

  async function generateGammaReport() {
    if (!selectedAnalysis || !user) return
    
    setGeneratingGamma(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/gamma/generate-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          analysisId: selectedAnalysis.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to generate Gamma report')
      }

      const data = await response.json()
      
      // Start polling for completion
      if (data.gamma?.id) {
        alert('🎨 Gamma Report Started!\n\nYour report is being generated. This usually takes 2-5 minutes. You can continue using Followlytics, and we\'ll notify you when it\'s ready.')
        pollGammaStatus(data.gamma.id)
        
        // Reload analysis to get the updated gamma_report field
        setTimeout(() => checkGammaReport(), 5000)
      }
    } catch (error: any) {
      console.error('Gamma generation error:', error)
      alert(`Gamma Report Error: ${error.message}`)
    } finally {
      setGeneratingGamma(false)
    }
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
      {/* AI Usage Stats & Export */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* AI Cost Stats */}
          {aiUsage && (
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-gray-400">AI Analyses</div>
                <div className="text-lg font-bold text-cyan-400">{aiUsage.total_analyses}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Total Cost</div>
                <div className="text-lg font-bold text-purple-400">${aiUsage.total_cost.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Followers Analyzed</div>
                <div className="text-lg font-bold text-blue-400">{aiUsage.total_followers_analyzed.toLocaleString()}</div>
              </div>
            </div>
          )}
          
          {/* Export Buttons */}
          <div className="flex gap-2 flex-wrap">
            {gammaReport?.status === 'completed' && gammaReport?.url ? (
              <a
                href={gammaReport.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                ✓ View Gamma Report
              </a>
            ) : gammaReport?.status === 'generating' || pollingGamma ? (
              <button
                disabled
                className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 opacity-50"
              >
                ⏳ Generating Gamma Report...
              </button>
            ) : (
              <button
                onClick={generateGammaReport}
                disabled={generatingGamma}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {generatingGamma ? '⏳ Starting...' : '🎨 Generate Aggregate Gamma'}
              </button>
            )}
            <button
              onClick={() => selectedAnalysis && deleteAnalysis(selectedAnalysis.id)}
              disabled={deletingAnalysis}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {deletingAnalysis ? '⏳ Deleting...' : '🗑️ Delete Analysis'}
            </button>
            <button
              onClick={exportAsJSON}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              📄 Export JSON
            </button>
            <button
              onClick={exportAsCSV}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              disabled={!analysis.individualAnalyses || analysis.individualAnalyses.length === 0}
            >
              📊 Export CSV
            </button>
          </div>
        </div>
      </div>

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
                  <div className="pt-3 border-t border-gray-700 mb-3">
                    <div className="text-xs text-gray-500 mb-1">✨ Action:</div>
                    <p className="text-xs text-cyan-400">{follower.actionRecommendation}</p>
                  </div>
                  
                  {/* Per-Follower Gamma */}
                  <div className="space-y-2">
                    {followerGammaReports[follower.username] ? (
                      <a
                        href={followerGammaReports[follower.username].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded text-xs font-medium text-center transition-all"
                      >
                        🎨 View Gamma Report →
                      </a>
                    ) : generatingFollowerGamma.has(follower.username) ? (
                      <button
                        disabled
                        className="w-full px-3 py-2 bg-gray-700 rounded text-xs font-medium opacity-50 cursor-not-allowed"
                      >
                        ⏳ Generating Gamma...
                      </button>
                    ) : (
                      <button
                        onClick={() => generateFollowerGamma(follower.username, follower)}
                        className="w-full px-3 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 border border-purple-500/30 rounded text-xs font-medium transition-all"
                      >
                        🎨 Generate Gamma
                      </button>
                    )}
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
