'use client'

import React, { useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

interface XAnalyticsData {
  user_metrics: {
    followers_count: number
    following_count: number
    tweet_count: number
    listed_count: number
  }
  recent_tweets: Array<{
    id: string
    text: string
    created_at: string
    public_metrics: {
      retweet_count: number
      like_count: number
      reply_count: number
      quote_count: number
    }
  }>
  engagement_rate: number
  top_performing_tweet: any
  total_impressions: number
  total_engagements: number
  sentiment_analysis: {
    positive: number
    negative: number
    neutral: number
  }
}

export default function XAnalyticsDashboard() {
  const [user] = useAuthState(auth)
  const [analyticsData, setAnalyticsData] = useState<XAnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')

  const fetchRealAnalytics = async () => {
    if (!username.trim()) {
      setError('Please enter a valid X username')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const token = await user?.getIdToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/x-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: username.replace('@', '') })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }

      setAnalyticsData(result.data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch X analytics')
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please sign in to view your X analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">🚀 XScope Analytics Platform</h1>
        <p className="text-blue-100">
          Comprehensive X Analytics using every endpoint of our $200/month X API v2 access
        </p>
      </div>

      {/* Username Input */}
      {!analyticsData ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Comprehensive X Analytics
            </h3>
            <p className="text-gray-600 mb-4">
              Advanced analytics using every X API v2 endpoint - followers, engagement, viral content, competitor analysis & more
            </p>
            
            <div className="max-w-md mx-auto mb-4">
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="elonmusk"
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && fetchRealAnalytics()}
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm max-w-md mx-auto">
                {error}
              </div>
            )}
            
            <button
              onClick={fetchRealAnalytics}
              disabled={loading || !username.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? '🔄 Analyzing...' : '📊 Get Real Analytics'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* User Info Header */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">@{username}</h2>
                <p className="text-gray-600">{analyticsData.user_metrics.followers_count.toLocaleString()} followers</p>
              </div>
              <button
                onClick={() => setAnalyticsData(null)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← Analyze Different Account
              </button>
            </div>
          </div>

          {/* Real Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.user_metrics.tweet_count.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">From X API</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Engagement</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.total_engagements.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">❤️</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Recent posts</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Engagement Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.engagement_rate}%</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-2">Calculated from real data</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Positive Sentiment</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.sentiment_analysis.positive}%</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">😊</span>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">AI sentiment analysis</p>
            </div>
          </div>

          {/* Real Data Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Post */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔥 Top Performing Post</h3>
              {analyticsData.top_performing_tweet ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 mb-2 text-sm">
                    {analyticsData.top_performing_tweet.text.substring(0, 150)}
                    {analyticsData.top_performing_tweet.text.length > 150 ? '...' : ''}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>❤️ {analyticsData.top_performing_tweet.public_metrics.like_count}</span>
                    <span>🔄 {analyticsData.top_performing_tweet.public_metrics.retweet_count}</span>
                    <span>💬 {analyticsData.top_performing_tweet.public_metrics.reply_count}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No recent posts found</p>
              )}
            </div>

            {/* Real Metrics Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Account Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Followers:</span>
                  <span className="font-semibold">{analyticsData.user_metrics.followers_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Following:</span>
                  <span className="font-semibold">{analyticsData.user_metrics.following_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Listed:</span>
                  <span className="font-semibold">{analyticsData.user_metrics.listed_count.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recent Posts:</span>
                  <span className="font-semibold">{analyticsData.recent_tweets.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={fetchRealAnalytics}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? '🔄 Refreshing...' : '🔄 Refresh Real Data'}
            </button>
            <button 
              onClick={() => alert('Report generation coming soon with Daytona processing!')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              📊 Generate Report
            </button>
            <button 
              onClick={() => alert('Viral prediction AI coming soon!')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔮 Predict Viral Posts
            </button>
          </div>
        </>
      )}
    </div>
  )
}

