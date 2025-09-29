'use client'

import React, { useState, useEffect } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '@/lib/firebase'

interface AnalyticsData {
  totalPosts: number
  totalEngagement: number
  avgEngagement: number
  topPost: string
  growthRate: number
  sentimentScore: number
}

export default function XAnalyticsDashboard() {
  const [user] = useAuthState(auth)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [xConnected, setXConnected] = useState(false)
  const [error, setError] = useState('')

  // Mock analytics data for demo
  const generateMockAnalytics = (): AnalyticsData => ({
    totalPosts: Math.floor(Math.random() * 500) + 100,
    totalEngagement: Math.floor(Math.random() * 10000) + 1000,
    avgEngagement: Math.floor(Math.random() * 50) + 10,
    topPost: "Your post about AI trends got the most engagement!",
    growthRate: Math.floor(Math.random() * 20) + 5,
    sentimentScore: Math.floor(Math.random() * 30) + 70
  })

  const connectToX = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Simulate X connection
      await new Promise(resolve => setTimeout(resolve, 2000))
      setXConnected(true)
      setAnalyticsData(generateMockAnalytics())
    } catch (err) {
      setError('Failed to connect to X. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const refreshAnalytics = () => {
    setAnalyticsData(generateMockAnalytics())
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
        <h1 className="text-2xl font-bold mb-2">📊 X Analytics Dashboard</h1>
        <p className="text-blue-100">
          Get insights into your X performance and optimize your social strategy
        </p>
      </div>

      {/* Connection Status */}
      {!xConnected ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connect Your X Account
            </h3>
            <p className="text-gray-600 mb-4">
              Connect your X account to start analyzing your posts and engagement
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
            <button
              onClick={connectToX}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? '🔄 Connecting...' : '🔗 Connect X Account'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData?.totalPosts}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">↗️ +12% from last month</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Engagement</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData?.totalEngagement?.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">❤️</span>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">↗️ +{analyticsData?.growthRate}% growth</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Engagement</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData?.avgEngagement}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-2">Per post average</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sentiment Score</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData?.sentimentScore}%</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">😊</span>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">Positive sentiment</p>
            </div>
          </div>

          {/* Insights Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Post */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔥 Top Performing Post</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 mb-2">{analyticsData?.topPost}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>❤️ 234 likes</span>
                  <span>🔄 89 reposts</span>
                  <span>💬 45 replies</span>
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🧠 AI Recommendations</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-700">Post between 2-4 PM for maximum engagement</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-700">Use more visual content - images get 2.3x more engagement</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-700">Your audience loves tech content - post more about AI trends</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={refreshAnalytics}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔄 Refresh Analytics
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              📊 Generate Report
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              🔮 Predict Viral Posts
            </button>
          </div>
        </>
      )}
    </div>
  )
}
