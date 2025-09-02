'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, TrendingDown, TrendingUp, Brain, Settings, LogOut } from "lucide-react"
import { FollowerChart } from '@/components/dashboard/FollowerChart'
import { UnfollowList } from '@/components/dashboard/UnfollowList'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { GrokInsights } from '@/components/dashboard/GrokInsights'

export default function DashboardPage() {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      redirect('/auth/login')
    }
  }, [loading, isAuthenticated])

  useEffect(() => {
    if (user) {
      // Fetch dashboard data
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    // This will be implemented with Firestore queries
    setLoadingData(false)
  }

  if (loading || loadingData) {
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
                <p className="text-sm text-gray-600">Welcome back, @{user.displayName || 'User'}</p>
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
        {/* Stats Cards */}
        <StatsCards 
          stats={{
            total: 1250,
            gained: 15,
            lost: 8,
            netChange: 7
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
                <FollowerChart data={[]} />
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <div>
            <GrokInsights analysis={null} />
          </div>
        </div>

        {/* Recent Unfollows */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Unfollows</CardTitle>
              <CardDescription>People who unfollowed you recently</CardDescription>
            </CardHeader>
            <CardContent>
              <UnfollowList unfollows={[]} />
            </CardContent>
          </Card>
        </div>

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
