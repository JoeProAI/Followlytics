'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

interface BotAnalysisResult {
  totalFollowers: number
  botsDetected: number
  botPercentage: number
  riskScore: number
  categories: {
    definiteBot: number
    likelyBot: number
    suspicious: number
    inactive: number
    clean: number
  }
  insights: string[]
  recommendations: string[]
}

export default function BotAnalysisCard() {
  const { user } = useAuth()
  const [analyzing, setAnalyzing] = useState(false)
  const [username, setUsername] = useState('')
  const [result, setResult] = useState<BotAnalysisResult | null>(null)
  const [error, setError] = useState('')

  const startAnalysis = async () => {
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    setAnalyzing(true)
    setError('')
    setResult(null)

    try {
      const token = await user?.getIdToken()
      
      // Start scan
      const response = await fetch('/api/bot-analysis/scan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username.replace('@', '') })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Analysis failed')
      }

      const { scanId } = await response.json()
      
      // Poll for results
      let attempts = 0
      const maxAttempts = 60 // 5 minutes (5 second intervals)
      
      const pollInterval = setInterval(async () => {
        attempts++
        
        try {
          const statusResponse = await fetch(`/api/bot-analysis/status?scanId=${scanId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            
            if (statusData.status === 'completed' && statusData.analysis) {
              clearInterval(pollInterval)
              setResult(statusData.analysis)
              setAnalyzing(false)
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval)
              setError(statusData.error || 'Analysis failed')
              setAnalyzing(false)
            }
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval)
            setError('Analysis timed out. Please try again.')
            setAnalyzing(false)
          }
        } catch (err) {
          console.error('Polling error:', err)
        }
      }, 5000)

    } catch (err: any) {
      console.error('Analysis error:', err)
      setError(err.message || 'Failed to start analysis')
      setAnalyzing(false)
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-500'
    if (score >= 40) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'HIGH RISK'
    if (score >= 40) return 'MEDIUM RISK'
    return 'LOW RISK'
  }

  return (
    <div className="bg-[#16181c] border border-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
          <span className="text-2xl">🤖</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Bot Detection</h3>
          <p className="text-sm text-gray-400">Analyze audience quality</p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Username to analyze
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="flex-1 px-4 py-2 bg-[#0f1419] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
              disabled={analyzing}
            />
            <button
              onClick={startAnalysis}
              disabled={analyzing}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Followers</div>
              <div className="text-2xl font-bold text-white">
                {result.totalFollowers.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Bots Detected</div>
              <div className="text-2xl font-bold text-red-500">
                {result.botsDetected.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">{result.botPercentage}%</div>
            </div>

            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Risk Score</div>
              <div className={`text-2xl font-bold ${getRiskColor(result.riskScore)}`}>
                {result.riskScore}/100
              </div>
              <div className={`text-xs ${getRiskColor(result.riskScore)}`}>
                {getRiskLabel(result.riskScore)}
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Category Breakdown
            </h4>
            <div className="space-y-2">
              {[
                { label: '✅ Clean Accounts', count: result.categories.clean, color: 'bg-green-500' },
                { label: '📉 Inactive Accounts', count: result.categories.inactive, color: 'bg-gray-500' },
                { label: '🔍 Suspicious Accounts', count: result.categories.suspicious, color: 'bg-yellow-500' },
                { label: '⚠️ Likely Bots', count: result.categories.likelyBot, color: 'bg-orange-500' },
                { label: '🚫 Definite Bots', count: result.categories.definiteBot, color: 'bg-red-500' }
              ].map((category) => {
                const percentage = Math.round((category.count / result.totalFollowers) * 100)
                return (
                  <div key={category.label} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-300">{category.label}</span>
                        <span className="text-sm text-gray-400">
                          {category.count.toLocaleString()} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className={`${category.color} h-2 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Insights */}
          {result.insights.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Key Insights
              </h4>
              <div className="space-y-2">
                {result.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Recommendations
              </h4>
              <div className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-blue-400 mt-0.5">→</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Gamma Report Button */}
          <div className="pt-4 border-t border-gray-800">
            <button
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all"
              onClick={() => {
                alert('🎨 Gamma report generation coming soon! This will create a beautiful presentation of your bot analysis.')
              }}
            >
              🎨 Generate Gamma Report
            </button>
          </div>
        </div>
      )}

      {/* Analyzing State */}
      {analyzing && !result && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-purple-600 mb-4"></div>
          <p className="text-gray-400">Analyzing followers for bot indicators...</p>
          <p className="text-sm text-gray-500 mt-2">This may take 2-5 minutes</p>
        </div>
      )}

      {/* Info Note */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          <strong>🛡️ Privacy Note:</strong> We analyze follower patterns to detect bots. We do not store or display individual follower usernames. You only receive aggregate statistics and insights.
        </p>
      </div>
    </div>
  )
}
