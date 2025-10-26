'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface AudienceInsights {
  totalFollowers: number
  analyzed: number
  sampleSize: number
  companySizes: {
    small: number
    medium: number
    large: number
    enterprise: number
    unknown: number
  }
  seniority: {
    executive: number
    senior: number
    midLevel: number
    entry: number
    unknown: number
  }
  topIndustries: Array<{ industry: string; count: number; percentage: number }>
  topLocations: Array<{ location: string; count: number; percentage: number }>
  topCompanies: Array<{ company: string; count: number; size: number }>
  topJobTitles: Array<{ title: string; count: number }>
  creditsUsed: number
}

interface Props {
  followers: string[] // Array of X usernames
}

export default function ApolloAudienceInsights({ followers }: Props) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<AudienceInsights | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function analyzeAudience() {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      
      const response = await fetch('/api/apollo/analyze-audience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          followers: followers,
          sampleSize: 100 // Analyze first 100 followers
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze audience')
      }

      setInsights(data.insights)
    } catch (err: any) {
      setError(err.message)
      console.error('Analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!followers || followers.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <div className="text-gray-400">
          Scan followers first to see audience insights
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light mb-2">Audience Intelligence</h2>
          <p className="text-gray-400 text-sm">
            Powered by Apollo.io • {followers.length} followers ready to analyze
          </p>
        </div>
        <button
          onClick={analyzeAudience}
          disabled={loading}
          className="bg-white text-black px-6 py-3 rounded font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : insights ? 'Re-analyze' : 'Analyze Audience'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="text-red-400">{error}</div>
        </div>
      )}

      {/* Results */}
      {insights && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Analyzed</div>
              <div className="text-3xl font-light">{insights.analyzed}</div>
              <div className="text-xs text-gray-600 mt-1">of {insights.totalFollowers} followers</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Decision Makers</div>
              <div className="text-3xl font-light">{insights.seniority.executive + insights.seniority.senior}</div>
              <div className="text-xs text-gray-600 mt-1">Exec + Senior level</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Enterprise</div>
              <div className="text-3xl font-light">{insights.companySizes.enterprise}</div>
              <div className="text-xs text-gray-600 mt-1">1,000+ employees</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Credits Used</div>
              <div className="text-3xl font-light text-green-400">{insights.creditsUsed}</div>
              <div className="text-xs text-gray-600 mt-1">FREE analytics</div>
            </div>
          </div>

          {/* Company Sizes */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Company Size Distribution</h3>
            <div className="space-y-3">
              <CompanySizeBar 
                label="Enterprise (1,000+)" 
                count={insights.companySizes.enterprise} 
                total={insights.analyzed}
                color="purple"
              />
              <CompanySizeBar 
                label="Large (200-1,000)" 
                count={insights.companySizes.large} 
                total={insights.analyzed}
                color="blue"
              />
              <CompanySizeBar 
                label="Medium (50-200)" 
                count={insights.companySizes.medium} 
                total={insights.analyzed}
                color="green"
              />
              <CompanySizeBar 
                label="Small (<50)" 
                count={insights.companySizes.small} 
                total={insights.analyzed}
                color="yellow"
              />
            </div>
          </div>

          {/* Seniority */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Seniority Levels</h3>
            <div className="space-y-3">
              <CompanySizeBar 
                label="Executive (C-level, VP)" 
                count={insights.seniority.executive} 
                total={insights.analyzed}
                color="purple"
              />
              <CompanySizeBar 
                label="Senior (Director+)" 
                count={insights.seniority.senior} 
                total={insights.analyzed}
                color="blue"
              />
              <CompanySizeBar 
                label="Mid-Level (Manager)" 
                count={insights.seniority.midLevel} 
                total={insights.analyzed}
                color="green"
              />
              <CompanySizeBar 
                label="Entry Level" 
                count={insights.seniority.entry} 
                total={insights.analyzed}
                color="gray"
              />
            </div>
          </div>

          {/* Top Industries */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Top Industries</h3>
            <div className="grid grid-cols-2 gap-4">
              {insights.topIndustries.slice(0, 8).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-sm text-gray-300">{item.industry}</span>
                  <span className="text-sm font-medium">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Companies */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Top Companies</h3>
            <div className="space-y-3">
              {insights.topCompanies.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-800">
                  <div>
                    <div className="text-sm text-gray-300">{item.company}</div>
                    <div className="text-xs text-gray-600">
                      {item.size > 0 ? `${item.size.toLocaleString()} employees` : 'Size unknown'}
                    </div>
                  </div>
                  <span className="text-sm font-medium">{item.count} followers</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Job Titles */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Most Common Job Titles</h3>
            <div className="grid grid-cols-2 gap-4">
              {insights.topJobTitles.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-sm text-gray-300 truncate mr-2">{item.title}</span>
                  <span className="text-sm font-medium flex-shrink-0">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Locations */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Top Locations</h3>
            <div className="grid grid-cols-2 gap-4">
              {insights.topLocations.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-800">
                  <span className="text-sm text-gray-300">{item.location}</span>
                  <span className="text-sm font-medium">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CompanySizeBar({ 
  label, 
  count, 
  total, 
  color 
}: { 
  label: string
  count: number
  total: number
  color: 'purple' | 'blue' | 'green' | 'yellow' | 'gray'
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  
  const colorClasses = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    gray: 'bg-gray-500'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm font-medium">{count} ({Math.round(percentage)}%)</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div 
          className={`${colorClasses[color]} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}


