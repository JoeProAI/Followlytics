'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, TrendingUp, UserMinus, Activity, RefreshCw, Download, Search, Filter, TrendingDown, Brain, Settings, LogOut, UserPlus } from 'lucide-react'
import TwitterArchiveImport from '@/components/TwitterArchiveImport'
import OctoparseIntegration from '@/components/OctoparseIntegration'
import ServiceTierSelector from '@/components/ServiceTierSelector'
import BrowserExtensionGuide from '@/components/BrowserExtensionGuide'
import ApiKeyManager from '@/components/ApiKeyManager'
import ExtensionDownload from '@/components/ExtensionDownload'
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard'
import SubscriptionStatus from '@/components/dashboard/SubscriptionStatus'
import FollowersList from '@/components/dashboard/FollowersList'

export default function DashboardPage() {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const [followers, setFollowers] = useState<any[]>([])
  const [unfollowers, setUnfollowers] = useState<any[]>([])
  const [scanLoading, setScanLoading] = useState(false)
  const [scanProgress, setScanProgress] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch followers on component mount
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchFollowers()
    }
  }, [isAuthenticated, user])

  const fetchFollowers = async () => {
    try {
      // First try to get followers from extension uploads
      const extensionResponse = await fetch('/api/extension/followers', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (extensionResponse.ok) {
        const extensionData = await extensionResponse.json()
        if (extensionData.followers && extensionData.followers.length > 0) {
          setFollowers(extensionData.followers)
          return
        }
      }
      
      // Fallback to Scrapfly if no extension data
      const response = await fetch('/api/twitter/followers-scrapfly', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFollowers(data.followers || [])
      } else {
        console.error('Failed to fetch followers:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching followers:', error)
    }
  }

  // Check for token in URL hash and authenticate
  useEffect(() => {
    const handleTokenAuth = async () => {
      const hash = window.location.hash
      if (hash.startsWith('#token=')) {
        const token = hash.substring(7)
        try {
          const { signInWithCustomToken } = await import('firebase/auth')
          const { auth } = await import('@/lib/firebase')
          await signInWithCustomToken(auth, token)
          window.history.replaceState({}, '', '/dashboard')
        } catch (error) {
          console.error('Token authentication failed:', error)
          setError('Authentication failed. Please try logging in again.')
        }
      }
    }
    handleTokenAuth()
  }, [])

  const handleScanFollowers = async () => {
    try {
      console.log('Starting follower scan...')
      setScanLoading(true)
      setError(null)
      setScanProgress(null)
      
      console.log('Making request to /api/twitter/followers-api')
      const response = await fetch('/api/twitter/followers-api', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        console.error('Parsed API Error:', errorData)
        throw new Error(errorData.error || 'Failed to scan followers')
      }
      
      const data = await response.json()
      
      if (data.job_id) {
        setScanProgress({
          processed: 0,
          total: data.estimated_total || 1000,
          status: 'Starting background scan...',
          job_id: data.job_id
        })
        pollJobProgress(data.job_id)
      } else {
        setFollowers(data.followers || [])
        setScanLoading(false)
      }
    } catch (error) {
      console.error('Scan error:', error)
      setError(error instanceof Error ? error.message : 'Failed to scan followers')
      setScanLoading(false)
      setScanProgress(null)
    }
  }

  const pollJobProgress = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/follower-scan?jobId=${jobId}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to get job status')
      }
      
      const data = await response.json()
      
      setScanProgress({
        processed: data.totalProcessed || 0,
        total: data.totalFollowers || 1000,
        status: data.status || 'Processing...',
        job_id: jobId
      })
      
      if (data.status === 'completed') {
        setScanLoading(false)
        setScanProgress(null)
        // Fetch updated followers
        await fetchFollowers()
      } else if (data.status === 'failed') {
        setError('Follower scan failed. Please try again.')
        setScanLoading(false)
        setScanProgress(null)
      } else {
        setTimeout(() => pollJobProgress(jobId), 2000)
      }
    } catch (error) {
      console.error('Polling error:', error)
      setError('Failed to get scan progress')
      setScanLoading(false)
      setScanProgress(null)
    }
  }

  // Don't auto-redirect - let user see the login button
  // useEffect(() => {
  //   if (!loading && !isAuthenticated) {
  //     window.location.href = '/'
  //   }
  // }, [loading, isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Check for debug parameters
    const urlParams = new URLSearchParams(window.location.search)
    const debugMode = urlParams.get('debug')
    const errorParam = urlParams.get('error')
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {debugMode ? 'Authentication Issue' : 'Access Denied'}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {errorParam ? `Error: ${decodeURIComponent(errorParam)}` : 'Please log in to access the dashboard.'}
          </p>
          {debugMode && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              <p className="text-sm">Debug mode: {debugMode}</p>
              <p className="text-sm">Try refreshing the page or logging in again.</p>
            </div>
          )}
          <a 
            href="/api/auth/twitter/login" 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Login with Twitter
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.displayName || 'User'}!
              </h1>
              <p className="text-gray-600 mt-1">
                Track your Twitter followers and discover who unfollowed you
              </p>
            </div>
            <div className="space-y-6 mb-6">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleScanFollowers}
                  disabled={scanLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${scanLoading ? 'animate-spin' : ''}`} />
                  {scanLoading ? 'Scanning...' : 'Scan Followers'}
                </Button>
                
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
              
              <ApiKeyManager />
              
              <ExtensionDownload />
              
              <BrowserExtensionGuide />
            </div>
            <Button 
              onClick={logout}
              variant="outline"
              className="border-gray-300"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Progress bar for scanning */}
        {scanProgress && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Scanning followers...</span>
                  <span>{scanProgress.processed} / {scanProgress.total}</span>
                </div>
                <Progress 
                  value={(scanProgress.processed / scanProgress.total) * 100} 
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Status: {scanProgress.status}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Subscription Status */}
        <div className="mb-6">
          <SubscriptionStatus />
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="followers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{followers.length.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Active followers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unfollowers</CardTitle>
                  <UserMinus className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{unfollowers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Recent unfollowers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">+2.4%</div>
                  <p className="text-xs text-muted-foreground">
                    This week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                  <Brain className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">4.2%</div>
                  <p className="text-xs text-muted-foreground">
                    Average rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Comprehensive Followers List */}
            <FollowersList onRefresh={fetchFollowers} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your Followlytics account preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Get notified when someone unfollows you</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Scan Frequency</p>
                    <p className="text-sm text-muted-foreground">How often to check for follower changes</p>
                  </div>
                  <Button variant="outline" size="sm">Daily</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Data Export</p>
                    <p className="text-sm text-muted-foreground">Download your follower data</p>
                  </div>
                  <Button variant="outline" size="sm">Export</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
