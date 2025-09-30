'use client'

import React, { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

type Tab = 'overview' | 'intelligence' | 'search' | 'compare' | 'trending' | 'competitor' | 'hashtag' | 'viral' | 'mentions' | 'tweet'

export default function ProfessionalAnalytics() {
  const [user] = useAuthState(auth)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // State
  const [username, setUsername] = useState('')
  const [data, setData] = useState<any>(null)
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
    { id: 'overview', label: 'Overview' },
    { id: 'intelligence', label: 'Content Intel' },
    { id: 'search', label: 'Search' },
    { id: 'compare', label: 'Compare Users' },
    { id: 'trending', label: 'Trending' },
    { id: 'competitor', label: 'Competitors' },
    { id: 'hashtag', label: 'Hashtags' },
    { id: 'mentions', label: 'Mentions' },
    { id: 'tweet', label: 'Tweet Analysis' }
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
        
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-900/50 text-red-400 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
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

            {data && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Followers</div>
                  <div className="text-2xl font-light">{data.user_metrics.followers_count.toLocaleString()}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Engagement Rate</div>
                  <div className="text-2xl font-light">{data.engagement_rate.toFixed(2)}%</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Posts</div>
                  <div className="text-2xl font-light">{data.user_metrics.tweet_count.toLocaleString()}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Sentiment</div>
                  <div className="text-2xl font-light">{data.sentiment_analysis.positive}%</div>
                </div>
              </div>
            )}

            {data?.top_performing_tweet && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="text-sm font-medium text-gray-400 mb-3">Top Performing Post</div>
                <p className="text-sm text-gray-300 mb-4">{data.top_performing_tweet.text}</p>
                <div className="flex gap-6 text-sm">
                  <span className="text-gray-400">{data.top_performing_tweet.public_metrics?.like_count?.toLocaleString()} likes</span>
                  <span className="text-gray-400">{data.top_performing_tweet.public_metrics?.retweet_count?.toLocaleString()} retweets</span>
                  <span className="text-gray-400">{data.top_performing_tweet.public_metrics?.reply_count?.toLocaleString()} replies</span>
                </div>
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

            {data && (
              <div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Posts</div>
                    <div className="text-2xl font-light">{data.totalTweets?.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Engagement</div>
                    <div className="text-2xl font-light">{data.totalEngagement?.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Avg Engagement</div>
                    <div className="text-2xl font-light">{data.avgEngagement?.toLocaleString()}</div>
                  </div>
                </div>

                {data.topTweet && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="text-sm font-medium text-gray-400 mb-3">Top Post</div>
                    <p className="text-sm text-gray-300 mb-4">{data.topTweet.text}</p>
                    <div className="flex gap-6 text-sm text-gray-400">
                      <span>{data.topTweet.public_metrics?.like_count?.toLocaleString()} likes</span>
                      <span>{data.topTweet.public_metrics?.retweet_count?.toLocaleString()} retweets</span>
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

        {/* Followers */}
        {activeTab === 'followers' && (
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
                  onClick={() => fetchData('/api/x-analytics/followers', { username: username.replace('@', ''), maxResults: 100 })}
                  disabled={loading || !username}
                  className="bg-white text-black px-8 py-2.5 rounded font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </div>

            {data && (
              <div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Total Followers</div>
                    <div className="text-2xl font-light">{data.user?.total_followers?.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Verified</div>
                    <div className="text-2xl font-light">{data.analytics?.verified_percentage}%</div>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                    <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Avg Followers</div>
                    <div className="text-2xl font-light">{data.analytics?.avg_follower_count?.toLocaleString()}</div>
                  </div>
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
