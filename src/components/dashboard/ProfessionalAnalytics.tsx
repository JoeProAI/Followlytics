'use client'

import React, { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'
import ApolloAudienceInsights from './ApolloAudienceInsights'

type Tab = 'overview' | 'audience' | 'intelligence' | 'search' | 'compare' | 'trending' | 'competitor' | 'hashtag' | 'viral' | 'mentions' | 'tweet' | 'safety'

export default function ProfessionalAnalytics() {
  const [user] = useAuthState(auth)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // State
  const [username, setUsername] = useState('')
  const [data, setData] = useState<any>(null)
  const [blocked, setBlocked] = useState<any[]>([])
  const [muted, setMuted] = useState<any[]>([])
  const [blockCheckInput, setBlockCheckInput] = useState('')
  const [blockCheckResults, setBlockCheckResults] = useState<any[]>([])
  const [competitorUsernames, setCompetitorUsernames] = useState(['', '', ''])
  const [hashtag, setHashtag] = useState('')
  const [tweetId, setTweetId] = useState('')

  const getToken = async () => {
    const token = await user?.getIdToken()
    if (!token) throw new Error('Authentication required')
    return token
  }

  const fetchData = async (endpoint: string, body: any) => {
    setLoading(true)
    setError('')
    try {
      const token = await getToken()
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', description: 'Get complete profile metrics including followers, engagement rates, and top posts' },
    { id: 'audience', label: 'Audience Intelligence', description: 'Apollo.io-powered analysis of your follower demographics, companies, and job titles' },
    { id: 'intelligence', label: 'Content Intel', description: 'AI-powered analysis of content patterns, optimal posting times, and recommendations' },
    { id: 'search', label: 'Search', description: 'Search X for tweets about any topic and analyze engagement patterns' },
    { id: 'compare', label: 'Compare Users', description: 'Side-by-side comparison of multiple X accounts with detailed metrics' },
    { id: 'trending', label: 'Trending', description: 'Discover trending topics and viral content in your industry' },
    { id: 'competitor', label: 'Competitors', description: 'Track competitor accounts and monitor their performance over time' },
    { id: 'hashtag', label: 'Hashtags', description: 'Analyze hashtag performance and discover optimal tags for your content' },
    { id: 'mentions', label: 'Mentions', description: 'Track mentions of any username or keyword across X' },
    { id: 'tweet', label: 'Tweet Analysis', description: 'Deep dive into individual tweets with detailed engagement analytics' }
  , { id: 'safety', label: 'Safety & Filters', description: 'Manage blocked/muted accounts and check who blocks you (bulk)' }
  ]

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Authentication required</p>
      </div>
    )
  }

  return (
    <div className="bg-black min-h-screen text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-light tracking-tight">X Analytics Platform</h1>
          <p className="text-gray-400 text-sm mt-1">Professional social intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-800 bg-black sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as Tab)
                  setData(null)
                  setError('')
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-white text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Tab Description */}
        <div className="mb-6 pb-4 border-b border-gray-800">
          <p className="text-gray-400 text-sm">
            {tabs.find(t => t.id === activeTab)?.description}
          </p>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-900/50 text-red-400 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Safety & Filters */}
        {activeTab === 'safety' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Blocked */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Blocked Accounts</div>
                    <div className="text-sm text-gray-500">You have blocked ({blocked.length})</div>
                  </div>
                  <button
                    className="text-xs px-3 py-1 bg-white text-black hover:bg-gray-200 rounded"
                    onClick={async () => {
                      try {
                        const token = await getToken()
                        const res = await fetch('/api/daytona/blocked-list', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }})
                        const json = await res.json()
                        setBlocked(json.items || [])
                      } catch (e) { setBlocked([]) }
                    }}
                  >Refresh</button>
                </div>
                <div className="max-h-64 overflow-auto divide-y divide-gray-800">
                  {blocked.length === 0 ? (
                    <div className="text-xs text-gray-500">No data yet</div>
                  ) : blocked.map((u:any, i:number) => (
                    <div key={i} className="py-2 text-sm flex justify-between">
                      <span>@{u.username || 'unknown'}</span>
                      <span className="text-gray-500">{u.followers?.toLocaleString?.() || ''}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Muted */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Muted Accounts</div>
                    <div className="text-sm text-gray-500">You have muted ({muted.length})</div>
                  </div>
                  <button
                    className="text-xs px-3 py-1 bg-white text-black hover:bg-gray-200 rounded"
                    onClick={async () => {
                      try {
                        const token = await getToken()
                        const res = await fetch('/api/daytona/muted-list', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }})
                        const json = await res.json()
                        setMuted(json.items || [])
                      } catch (e) { setMuted([]) }
                    }}
                  >Refresh</button>
                </div>
                <div className="max-h-64 overflow-auto divide-y divide-gray-800">
                  {muted.length === 0 ? (
                    <div className="text-xs text-gray-500">No data yet</div>
                  ) : muted.map((u:any, i:number) => (
                    <div key={i} className="py-2 text-sm flex justify-between">
                      <span>@{u.username || 'unknown'}</span>
                      <span className="text-gray-500">{u.followers?.toLocaleString?.() || ''}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Who Blocks You (Bulk) */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                <div className="mb-3">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Who Blocks You (Bulk)</div>
                  <div className="text-sm text-gray-500">Paste @handles (one per line)</div>
                </div>
                <textarea
                  value={blockCheckInput}
                  onChange={(e) => setBlockCheckInput(e.target.value)}
                  placeholder="elonmusk\nnaval\njack"
                  className="w-full h-24 bg-black border border-gray-800 rounded p-2 text-sm mb-3"
                />
                <div className="flex items-center justify-between">
                  <button
                    className="text-xs px-3 py-1 bg-white text-black hover:bg-gray-200 rounded"
                    onClick={async () => {
                      try {
                        const token = await getToken()
                        const usernames = blockCheckInput.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
                        const res = await fetch('/api/daytona/block-check', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ usernames })
                        })
                        const json = await res.json()
                        setBlockCheckResults(json.results || [])
                      } catch (e) { setBlockCheckResults([]) }
                    }}
                  >Check</button>
                  <div className="text-xs text-gray-500">Checked: {blockCheckResults.length}</div>
                </div>
                <div className="max-h-40 overflow-auto divide-y divide-gray-800 mt-3">
                  {blockCheckResults.length === 0 ? (
                    <div className="text-xs text-gray-500">No results yet</div>
                  ) : blockCheckResults.map((r:any, i:number) => (
                    <div key={i} className="py-2 text-sm flex justify-between">
                      <span>@{r.username}</span>
                      <span className={r.blocksYou ? 'text-red-400' : 'text-gray-500'}>{r.blocksYou ? 'BLOCKS YOU' : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="elonmusk"
                  className="flex-1 bg-gray-900 border border-gray-800 rounded px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700"
                  onKeyPress={(e) => e.key === 'Enter' && fetchData('/api/x-analytics', { username: username.replace('@', '') })}
                />
                <button
                  onClick={() => fetchData('/api/x-analytics', { username: username.replace('@', '') })}
                  disabled={loading || !username}
                  className="bg-white text-black px-8 py-2.5 rounded font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Loading...' : 'Analyze'}
                </button>
              </div>
            </div>

            {data?.user_metrics && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Followers</div>
                  <div className="text-2xl font-light">{data.user_metrics?.followers_count?.toLocaleString() || '0'}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Engagement Rate</div>
                  <div className="text-2xl font-light">{data.engagement_rate?.toFixed(2) || '0'}%</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Posts</div>
                  <div className="text-2xl font-light">{data.user_metrics?.tweet_count?.toLocaleString() || '0'}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Sentiment</div>
                  <div className="text-2xl font-light">{data.sentiment_analysis?.positive || '0'}%</div>
                </div>
              </div>
            )}

            {/* Account Strategy Summary */}
            {data?.account_strategy && (
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-sm font-medium text-blue-400">📊 Account Strategy</div>
                  <div className="text-xs px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20">
                    Grok AI
                  </div>
                </div>

                {/* What's Working */}
                {data.account_strategy.what_works && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-green-400 mb-2">✓ What's Working</div>
                    <p className="text-sm text-gray-300">{data.account_strategy.what_works}</p>
                  </div>
                )}

                {/* What to Improve */}
                {data.account_strategy.what_to_improve && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-yellow-400 mb-2">⚡ What to Improve</div>
                    <p className="text-sm text-gray-300">{data.account_strategy.what_to_improve}</p>
                  </div>
                )}

                {/* Action Plan */}
                {data.account_strategy.action_plan?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-blue-400 mb-2">🎯 Action Plan</div>
                    <div className="space-y-2">
                      {data.account_strategy.action_plan.map((item: any, i: number) => (
                        <div key={i} className="bg-gray-900/50 border border-gray-800 rounded p-3">
                          <div className="text-sm text-white mb-1">{item.action}</div>
                          <div className="text-xs text-gray-400">{item.why}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Post Idea */}
                {data.account_strategy.next_post_idea && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
                    <div className="text-xs font-medium text-purple-400 mb-2">💡 Next Post Idea</div>
                    <p className="text-sm text-gray-300 italic">{data.account_strategy.next_post_idea}</p>
                  </div>
                )}
              </div>
            )}

            {/* Most Recent Post */}
            {data?.most_recent_tweet && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-400">📍 Most Recent Post</div>
                  {data.most_recent_tweet.ai_analysis && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20">
                        Grok AI
                      </div>
                      <div className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        Score: {data.most_recent_tweet.ai_analysis.performance_score}/100
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-300 mb-4 border-l-2 border-purple-700 pl-3">{data.most_recent_tweet.text}</p>
                
                <div className="flex gap-6 text-sm mb-4">
                  <span className="text-gray-400">{data.most_recent_tweet.public_metrics?.like_count?.toLocaleString()} likes</span>
                  <span className="text-gray-400">{data.most_recent_tweet.public_metrics?.retweet_count?.toLocaleString()} retweets</span>
                  <span className="text-gray-400">{data.most_recent_tweet.public_metrics?.reply_count?.toLocaleString()} replies</span>
                </div>

                {data.most_recent_tweet.ai_analysis && (
                  <div className="space-y-3 border-t border-gray-800 pt-4">
                    <div>
                      <div className="text-xs font-medium text-green-400 mb-1">Why It Worked</div>
                      <ul className="space-y-1">
                        {data.most_recent_tweet.ai_analysis.why_it_worked?.map((reason: string, i: number) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start">
                            <span className="text-green-500 mr-2">✓</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-blue-400 mb-1">How to Improve</div>
                      <ul className="space-y-1">
                        {data.most_recent_tweet.ai_analysis.improvements?.map((tip: string, i: number) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start">
                            <span className="text-blue-500 mr-2">→</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {data.most_recent_tweet.ai_analysis.content_type && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Type:</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-700">
                          {data.most_recent_tweet.ai_analysis.content_type}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Top Performing Post */}
            {data?.top_performing_tweet && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-400">🏆 Top Performing Post</div>
                  {data.top_performing_tweet.ai_analysis && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20">
                        Grok AI
                      </div>
                      <div className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Score: {data.top_performing_tweet.ai_analysis.performance_score}/100
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-300 mb-4 border-l-2 border-yellow-700 pl-3">{data.top_performing_tweet.text}</p>
                
                <div className="flex gap-6 text-sm mb-4">
                  <span className="text-gray-400">{data.top_performing_tweet.public_metrics?.like_count?.toLocaleString()} likes</span>
                  <span className="text-gray-400">{data.top_performing_tweet.public_metrics?.retweet_count?.toLocaleString()} retweets</span>
                  <span className="text-gray-400">{data.top_performing_tweet.public_metrics?.reply_count?.toLocaleString()} replies</span>
                </div>

                {data.top_performing_tweet.ai_analysis && (
                  <div className="space-y-3 border-t border-gray-800 pt-4">
                    <div>
                      <div className="text-xs font-medium text-green-400 mb-1">Why It Performed Well</div>
                      <ul className="space-y-1">
                        {data.top_performing_tweet.ai_analysis.why_it_worked?.map((reason: string, i: number) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start">
                            <span className="text-green-500 mr-2">✓</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-blue-400 mb-1">How to Improve</div>
                      <ul className="space-y-1">
                        {data.top_performing_tweet.ai_analysis.improvements?.map((tip: string, i: number) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start">
                            <span className="text-blue-500 mr-2">→</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {data.top_performing_tweet.ai_analysis.content_type && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Type:</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-700">
                          {data.top_performing_tweet.ai_analysis.content_type}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Intelligence */}
        {activeTab === 'intelligence' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="elonmusk"
                  className="flex-1 bg-gray-900 border border-gray-800 rounded px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700"
                />
                <button
                  onClick={() => fetchData('/api/intelligence/content', { username: username.replace('@', '') })}
                  disabled={loading || !username}
                  className="bg-white text-black px-8 py-2.5 rounded font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Deep analysis of up to 500 tweets</p>
            </div>

            {data?.analysis && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Analyzed</div>
                    <div className="text-2xl font-light">{data.analysis.tweets_analyzed}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Avg Likes</div>
                    <div className="text-2xl font-light">{data.analysis.engagement_stats?.avg_likes_per_tweet}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Avg Retweets</div>
                    <div className="text-2xl font-light">{data.analysis.engagement_stats?.avg_retweets_per_tweet}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Engagement</div>
                    <div className="text-2xl font-light">{data.analysis.engagement_stats?.engagement_rate?.toFixed(2)}%</div>
                  </div>
                </div>

                {data.analysis.recommendations?.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="text-sm font-medium text-gray-400 mb-4">Recommendations</div>
                    <div className="space-y-3">
                      {data.analysis.recommendations.map((rec: any, idx: number) => (
                        <div key={idx} className="border-l-2 border-white pl-4">
                          <div className="text-sm mb-1">{rec.insight}</div>
                          <div className="text-xs text-gray-400">{rec.action}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Audience Intelligence */}
        {activeTab === 'audience' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium mb-2">Powered by Apollo.io</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Get deep insights into your X followers' professional demographics including company sizes, job titles, industries, and locations - all without revealing personal contact information.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div>✓ Company size distribution</div>
                    <div>✓ Seniority levels</div>
                    <div>✓ Industry breakdown</div>
                    <div>✓ Geographic analysis</div>
                    <div>✓ Top companies following you</div>
                    <div>✓ Most common job titles</div>
                  </div>
                </div>
              </div>
            </div>

            {data?.followers && data.followers.length > 0 ? (
              <ApolloAudienceInsights followers={data.followers} />
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 text-center">
                <div className="text-yellow-400 mb-2">No follower data available</div>
                <div className="text-sm text-gray-400 mb-4">
                  Please scan your followers first using the Overview tab
                </div>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="bg-white text-black px-6 py-2 rounded font-medium hover:bg-gray-200"
                >
                  Go to Overview
                </button>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Search Query</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="AI OR artificial intelligence"
                  className="flex-1 bg-gray-900 border border-gray-800 rounded px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700"
                />
                <button
                  onClick={() => fetchData('/api/intelligence/search', { query: username, maxResults: 100 })}
                  disabled={loading || !username}
                  className="bg-white text-black px-8 py-2.5 rounded font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Search X for tweets about any topic</p>
            </div>

            {data?.results && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Found</div>
                    <div className="text-2xl font-light">{data.results.total_found}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Engagement</div>
                    <div className="text-2xl font-light">{data.results.total_engagement?.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Avg Engagement</div>
                    <div className="text-2xl font-light">{data.results.avg_engagement}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Likes</div>
                    <div className="text-2xl font-light">{data.results.total_likes?.toLocaleString()}</div>
                  </div>
                </div>

                {data.top_tweets?.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="text-sm font-medium text-gray-400 mb-4">Top Tweets</div>
                    <div className="space-y-4">
                      {data.top_tweets.slice(0, 10).map((tweet: any, idx: number) => (
                        <div key={idx} className="border-b border-gray-800 last:border-0 pb-4 last:pb-0">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium">@{tweet.author?.username}</span>
                            <span className="text-xs text-gray-500">{tweet.engagement} engagement</span>
                          </div>
                          <p className="text-sm text-gray-300">{tweet.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Compare Users */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Usernames to Compare (2-5)</label>
              <div className="space-y-3 mb-4">
                {competitorUsernames.map((name, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...competitorUsernames]
                      newNames[idx] = e.target.value
                      setCompetitorUsernames(newNames)
                    }}
                    placeholder={`Username ${idx + 1}`}
                    className="w-full bg-gray-900 border border-gray-800 rounded px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700"
                  />
                ))}
              </div>
              <button
                onClick={() => fetchData('/api/intelligence/user-compare', { 
                  usernames: competitorUsernames.filter(u => u.trim()).map(u => u.replace('@', '')) 
                })}
                disabled={loading || competitorUsernames.filter(u => u.trim()).length < 2}
                className="bg-white text-black px-8 py-2 rounded font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? 'Comparing...' : 'Compare'}
              </button>
            </div>

            {data?.users && (
              <div className="space-y-6">
                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-black">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Followers</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Avg Engagement</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {data.users.map((user: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-900/50">
                          <td className="px-6 py-4 text-sm">@{user.username}</td>
                          <td className="px-6 py-4 text-sm text-right">{user.followers?.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-right">{user.engagement?.avg_per_tweet}</td>
                          <td className="px-6 py-4 text-sm text-right">{user.engagement?.engagement_rate?.toFixed(3)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {data.insights?.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="text-sm font-medium text-gray-400 mb-4">Insights</div>
                    <div className="space-y-2">
                      {data.insights.map((insight: string, idx: number) => (
                        <div key={idx} className="text-sm text-gray-300">• {insight}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Trending */}
        {activeTab === 'trending' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Topic</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="AI"
                  className="flex-1 bg-gray-900 border border-gray-800 rounded px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700"
                />
                <button
                  onClick={() => fetchData('/api/intelligence/trending', { topic: username, minEngagement: 100 })}
                  disabled={loading || !username}
                  className="bg-white text-black px-8 py-2.5 rounded font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Finding...' : 'Find Trending'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Discover trending content about any topic</p>
            </div>

            {data?.summary && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Trending Tweets</div>
                    <div className="text-2xl font-light">{data.summary.total_tweets}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Engagement</div>
                    <div className="text-2xl font-light">{data.summary.total_engagement?.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Avg Engagement</div>
                    <div className="text-2xl font-light">{data.summary.avg_engagement}</div>
                  </div>
                </div>

                {data.trending_tweets?.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="text-sm font-medium text-gray-400 mb-4">Trending Content</div>
                    <div className="space-y-4">
                      {data.trending_tweets.slice(0, 10).map((tweet: any, idx: number) => (
                        <div key={idx} className="border-b border-gray-800 last:border-0 pb-4 last:pb-0">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium">@{tweet.author?.username}</span>
                            <span className="text-xs text-gray-500">{tweet.engagement} engagement</span>
                          </div>
                          <p className="text-sm text-gray-300 mb-2">{tweet.text}</p>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>{tweet.metrics?.likes} likes</span>
                            <span>{tweet.metrics?.retweets} retweets</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Competitor Analysis */}
        {activeTab === 'competitor' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Compare Accounts (2-5)</label>
              <div className="space-y-3 mb-4">
                {competitorUsernames.map((name, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...competitorUsernames]
                      newNames[idx] = e.target.value
                      setCompetitorUsernames(newNames)
                    }}
                    placeholder={`Account ${idx + 1}`}
                    className="w-full bg-gray-900 border border-gray-800 rounded px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700"
                  />
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCompetitorUsernames([...competitorUsernames, ''])}
                  className="text-gray-400 text-sm hover:text-white"
                >
                  + Add account
                </button>
                <button
                  onClick={() => fetchData('/api/x-analytics/competitor', { 
                    usernames: competitorUsernames.filter(u => u.trim()).map(u => u.replace('@', '')) 
                  })}
                  disabled={loading || competitorUsernames.filter(u => u.trim()).length < 2}
                  className="ml-auto bg-white text-black px-8 py-2 rounded font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Analyzing...' : 'Compare'}
                </button>
              </div>
            </div>

            {data?.competitors && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                  <div className="text-sm font-medium text-gray-400 mb-4">Benchmark</div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Average Followers</div>
                      <div className="text-xl font-light">{Math.round(data.comparison?.avgFollowers || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Average Engagement</div>
                      <div className="text-xl font-light">{(data.comparison?.avgEngagement || 0).toFixed(2)}%</div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Account</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Followers</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Engagement</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Posts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {data.competitors.map((comp: any, idx: number) => (
                        <tr key={idx} className="bg-black hover:bg-gray-900/50">
                          <td className="px-6 py-4 text-sm font-medium">@{comp.username}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-300">
                            {comp.user_metrics?.followers_count?.toLocaleString() || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-300">
                            {comp.engagement_rate?.toFixed(2) || '-'}%
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-300">
                            {comp.user_metrics?.tweet_count?.toLocaleString() || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hashtag Tracking */}
        {activeTab === 'hashtag' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Hashtag</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={hashtag}
                  onChange={(e) => setHashtag(e.target.value)}
                  placeholder="AI"
                  className="flex-1 bg-gray-900 border border-gray-800 rounded px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700"
                  onKeyPress={(e) => e.key === 'Enter' && fetchData('/api/x-analytics/hashtag', { hashtag: hashtag.replace('#', ''), maxResults: 100 })}
                />
                <button
                  onClick={() => fetchData('/api/x-analytics/hashtag', { hashtag: hashtag.replace('#', ''), maxResults: 100 })}
                  disabled={loading || !hashtag}
                  className="bg-white text-black px-8 py-2.5 rounded font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Track'}
                </button>
              </div>
            </div>

            {data && data.data && (
              <div>
                {/* Show message if no results */}
                {data.data.totalTweets === 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 mb-6">
                    <div className="text-yellow-400 text-sm">
                      {data.data.message || `No tweets found for #${hashtag}. X API only shows tweets from the last 7 days. Try a more popular hashtag like "AI" or "crypto".`}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Posts</div>
                    <div className="text-2xl font-light">{data.data.totalTweets?.toLocaleString() || '0'}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Engagement</div>
                    <div className="text-2xl font-light">{data.data.totalEngagement?.toLocaleString() || '0'}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Avg Engagement</div>
                    <div className="text-2xl font-light">{data.data.avgEngagement?.toLocaleString() || '0'}</div>
                  </div>
                </div>

                {data.data.topTweet && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="text-sm font-medium text-gray-400 mb-3">Top Post</div>
                    <p className="text-sm text-gray-300 mb-4">{data.data.topTweet.text}</p>
                    <div className="flex gap-6 text-sm text-gray-400">
                      <span>{data.data.topTweet.public_metrics?.like_count?.toLocaleString() || '0'} likes</span>
                      <span>{data.data.topTweet.public_metrics?.retweet_count?.toLocaleString() || '0'} retweets</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Viral Detection */}
        {activeTab === 'viral' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Search Query (Optional)</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Leave empty for trending content"
                  className="flex-1 bg-gray-900 border border-gray-800 rounded px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700"
                />
                <button
                  onClick={() => fetchData('/api/x-analytics/viral', { query: username, minLikes: 10000 })}
                  disabled={loading}
                  className="bg-white text-black px-8 py-2.5 rounded font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Find Viral'}
                </button>
              </div>
            </div>

            {data?.tweets && (
              <div>
                <div className="text-sm text-gray-400 mb-4">{data.total} viral posts found (10k+ likes)</div>
                <div className="space-y-3">
                  {data.tweets.slice(0, 10).map((tweet: any, idx: number) => (
                    <div key={idx} className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-colors">
                      <p className="text-sm text-gray-300 mb-3">{tweet.text}</p>
                      <div className="flex gap-6 text-xs text-gray-500">
                        <span>{tweet.public_metrics?.like_count?.toLocaleString()} likes</span>
                        <span>{tweet.public_metrics?.retweet_count?.toLocaleString()} retweets</span>
                        <span>{tweet.public_metrics?.reply_count?.toLocaleString()} replies</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mentions */}
        {activeTab === 'mentions' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tesla"
                  className="flex-1 bg-gray-900 border border-gray-800 rounded px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700"
                />
                <button
                  onClick={() => fetchData('/api/x-analytics/mentions', { username: username.replace('@', ''), maxResults: 100 })}
                  disabled={loading || !username}
                  className="bg-white text-black px-8 py-2.5 rounded font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Finding...' : 'Track Mentions'}
                </button>
              </div>
            </div>

            {data && (
              <div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Mentions</div>
                    <div className="text-2xl font-light">{data.analytics?.total_mentions}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Engagement</div>
                    <div className="text-2xl font-light">{data.analytics?.total_engagement?.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Avg Engagement</div>
                    <div className="text-2xl font-light">{data.analytics?.avg_engagement}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {data.mentions?.slice(0, 10).map((mention: any, idx: number) => (
                    <div key={idx} className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-300">
                      {mention.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tweet Analysis */}
        {activeTab === 'tweet' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Tweet ID</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={tweetId}
                  onChange={(e) => setTweetId(e.target.value)}
                  placeholder="1234567890"
                  className="flex-1 bg-gray-900 border border-gray-800 rounded px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700"
                />
                <button
                  onClick={() => fetchData('/api/x-analytics/tweet-analysis', { tweetId })}
                  disabled={loading || !tweetId}
                  className="bg-white text-black px-8 py-2.5 rounded font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </div>

            {data?.engagement && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Likes</div>
                  <div className="text-2xl font-light mb-2">{data.engagement.likes?.total}</div>
                  <div className="text-xs text-gray-500">{data.engagement.likes?.verified_percentage}% verified</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Retweets</div>
                  <div className="text-2xl font-light mb-2">{data.engagement.retweets?.total}</div>
                  <div className="text-xs text-gray-500">{data.engagement.retweets?.verified_percentage}% verified</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Quotes</div>
                  <div className="text-2xl font-light">{data.engagement.quotes?.total}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

