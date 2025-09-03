'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, TrendingDown, TrendingUp, Brain, Settings, LogOut, RefreshCw, UserMinus, UserPlus } from "lucide-react"
import { FollowerChart } from '@/components/dashboard/FollowerChart'
import { UnfollowList } from '@/components/dashboard/UnfollowList'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { GrokInsights } from '@/components/dashboard/GrokInsights'

export default function DashboardPage() {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const [followers, setFollowers] = useState<any[]>([])
  const [unfollowers, setUnfollowers] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [scanningFollowers, setScanningFollowers] = useState(false)
  const [checkingUnfollowers, setCheckingUnfollowers] = useState(false)

  useEffect(() => {
    console.log('Dashboard auth check:', { loading, isAuthenticated, user })
    if (!loading && !isAuthenticated) {
      console.log('Redirecting to home - not authenticated')
      window.location.href = '/'
    }
  }, [loading, isAuthenticated, user])

  useEffect(() => {
    if (user) {
      fetchAnalytics()
      fetchUnfollowers()
    }
  }, [user])

  const scanFollowers = async () => {
    setScanningFollowers(true)
    try {
      const response = await fetch('/api/twitter/followers')
      if (response.ok) {
        const data = await response.json()
        setFollowers(data.followers || [])
        // Refresh analytics after scan
        await fetchAnalytics()
      } else {
        console.error('Failed to scan followers')
      }
    } catch (error) {
      console.error('Error scanning followers:', error)
    } finally {
      setScanningFollowers(false)
    }
  }

  const fetchUnfollowers = async () => {
    setCheckingUnfollowers(true)
    try {
      const response = await fetch('/api/twitter/unfollowers')
      if (response.ok) {
        const data = await response.json()
        setUnfollowers(data.unfollowers || [])
      }
    } catch (error) {
      console.error('Error fetching unfollowers:', error)
    } finally {
      setCheckingUnfollowers(false)
    }
  }

  const fetchAnalytics = async () => {
    setLoadingData(true)
    try {
      const response = await fetch('/api/twitter/analytics?days=30')
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-primary mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Followlytics</h1>
                <p className="text-sm text-gray-600">Welcome back, @{user.displayName || user.email || 'User'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">Free Plan</Badge>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Button 
            onClick={scanFollowers} 
            disabled={scanningFollowers}
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${scanningFollowers ? 'animate-spin' : ''}`} />
            {scanningFollowers ? 'Scanning...' : 'Scan Followers'}
          </Button>
          <Button 
            variant="outline"
            onClick={fetchUnfollowers} 
            disabled={checkingUnfollowers}
            className="flex items-center"
          >
            <UserMinus className="h-4 w-4 mr-2" />
            {checkingUnfollowers ? 'Checking...' : 'Check Unfollowers'}
          </Button>
          <Button 
            variant="outline"
            onClick={fetchAnalytics} 
            disabled={loadingData}
            className="flex items-center"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {loadingData ? 'Loading...' : 'Refresh Analytics'}
          </Button>
        </div>

        {/* Stats Cards */}
        <StatsCards 
          stats={{
            total: analytics?.summary?.current_followers || 0,
            gained: analytics?.summary?.net_growth > 0 ? analytics.summary.net_growth : 0,
            lost: unfollowers.length,
            netChange: analytics?.summary?.net_growth || 0
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Follower Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Follower Trends</CardTitle>
                <CardDescription>Your follower count over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <FollowerChart data={analytics?.follower_history || []} />
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <div>
            <GrokInsights analysis={analytics} />
          </div>
        </div>

        {/* Recent Unfollows */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Unfollows</CardTitle>
                  <CardDescription>
                    {unfollowers.length > 0 
                      ? `${unfollowers.length} people unfollowed you recently`
                      : 'No recent unfollows detected'
                    }
                  </CardDescription>
                </div>
                {unfollowers.length > 0 && (
                  <Badge variant="destructive">{unfollowers.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {unfollowers.length > 0 ? (
                <div className="space-y-4">
                  {unfollowers.map((unfollower) => (
                    <div key={unfollower.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <img 
                        src={unfollower.profile_image_url} 
                        alt={unfollower.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{unfollower.name}</h4>
                          {unfollower.verified && (
                            <Badge variant="secondary" className="text-xs">Verified</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">@{unfollower.username}</p>
                        <p className="text-xs text-gray-500">{unfollower.followers_count?.toLocaleString()} followers</p>
                      </div>
                      <UserMinus className="h-5 w-5 text-red-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <UserMinus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No unfollowers detected yet.</p>
                  <p className="text-sm">Run a follower scan to start tracking changes.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Current Followers (if available) */}
        {followers.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Current Followers</CardTitle>
                <CardDescription>Your most recent follower scan ({followers.length} followers)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {followers.slice(0, 50).map((follower) => (
                    <div key={follower.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <img 
                        src={follower.profile_image_url} 
                        alt={follower.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1">
                          <p className="font-medium text-sm truncate">{follower.name}</p>
                          {follower.verified && (
                            <Badge variant="secondary" className="text-xs">✓</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">@{follower.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {followers.length > 50 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    Showing first 50 of {followers.length} followers
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upgrade CTA for Free Users */}
        <div className="mt-8">
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Unlock AI Insights
              </CardTitle>
              <CardDescription>
                Get detailed analysis of why people unfollowed you with xAI Grok
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    • Understand unfollow patterns<br/>
                    • Get actionable content insights<br/>
                    • Track longer history
                  </p>
                </div>
                <Button>
                  Upgrade to Starter - $19/mo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
