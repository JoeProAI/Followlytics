'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AnalyticsDashboard from '@/components/dashboard/AnalyticsDashboard'
import { Users, TrendingDown, TrendingUp, Brain, Settings, LogOut, RefreshCw, UserMinus, UserPlus } from "lucide-react"

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
      const response = await fetch('/api/followers', {
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
      setScanLoading(true)
      setError(null)
      setScanProgress(null)
      
      const response = await fetch('/api/twitter/followers', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = '/'
    }
  }, [loading, isAuthenticated])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Redirecting to login...</p>
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
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleScanFollowers} 
                disabled={scanLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {scanLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {scanProgress ? `Scanning... ${scanProgress.processed}/${scanProgress.total}` : 'Starting...'}
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Scan Followers
                  </>
                )}
              </Button>
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

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Followers</CardTitle>
                  <CardDescription>
                    Your most recent followers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {followers.length > 0 ? (
                    <div className="space-y-4">
                      {followers.slice(0, 10).map((follower) => (
                        <div key={follower.id} className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={follower.profile_image_url} />
                            <AvatarFallback>{follower.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{follower.name}</p>
                            <p className="text-sm text-gray-500">@{follower.username}</p>
                          </div>
                          <Badge variant="secondary">
                            {follower.followers_count?.toLocaleString() || 0} followers
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">No followers data available</p>
                      <p className="text-sm text-muted-foreground">Click "Scan Followers" to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Unfollowers</CardTitle>
                  <CardDescription>
                    People who recently unfollowed you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {unfollowers.length > 0 ? (
                    <div className="space-y-4">
                      {unfollowers.slice(0, 10).map((unfollower) => (
                        <div key={unfollower.id} className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={unfollower.profile_image_url} />
                            <AvatarFallback>{unfollower.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{unfollower.name}</p>
                            <p className="text-sm text-gray-500">@{unfollower.username}</p>
                          </div>
                          <Badge variant="destructive">
                            Unfollowed
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <UserMinus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">No unfollowers detected</p>
                      <p className="text-sm text-muted-foreground">Great job keeping your audience engaged!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
