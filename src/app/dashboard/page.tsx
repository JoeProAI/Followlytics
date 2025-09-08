'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, TrendingUp, UserMinus, RefreshCw, Settings, LogOut, Zap, DollarSign, Clock, Brain } from 'lucide-react'
import DaytonaScanProgress from '@/components/dashboard/DaytonaScanProgress'
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
  const [username, setUsername] = useState('')

  // Fetch existing followers on component mount
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchExistingFollowers()
    }
  }, [isAuthenticated, user])

  const fetchExistingFollowers = async () => {
    try {
      // Try to get existing followers from previous scans
      const response = await fetch('/api/followers/recent', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.followers && data.followers.length > 0) {
          setFollowers(data.followers)
        }
      }
    } catch (error) {
      console.error('Error fetching existing followers:', error)
    }
  }

  const handleDaytonaScan = async () => {
    if (!username.trim()) {
      setError('Please enter a Twitter username')
      return
    }

    try {
      console.log('Starting Daytona scan for:', username)
      setScanLoading(true)
      setError(null)
      
      // Submit to unified Daytona system
      const response = await fetch('/api/scan/daytona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: username.replace('@', '').trim(),
          priority: 'normal',
          user_id: user?.uid
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Scan submission failed')
      }
      
      const scanData = await response.json()
      
      // Start progress tracking
      setScanProgress({
        job_id: scanData.job_id,
        username: scanData.username,
        status: scanData.status,
        account_size: scanData.account_size,
        estimated_duration: scanData.estimated_duration,
        estimated_cost: scanData.estimated_cost,
        progress: 0
      })
      
      // Poll for updates
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/scan/daytona?job_id=${scanData.job_id}`)
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            
            setScanProgress((prev: any) => ({
              ...prev,
              status: statusData.status,
              progress: statusData.progress || 0,
              results: statusData.results
            }))
            
            if (statusData.status === 'completed') {
              clearInterval(pollInterval)
              setScanLoading(false)
              
              // Update followers with results
              if (statusData.results?.followers) {
                setFollowers(statusData.results.followers)
              }
              
              setError(null)
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval)
              setScanLoading(false)
              setError(statusData.error || 'Scan failed')
            }
          }
        } catch (pollError) {
          console.error('Polling error:', pollError)
        }
      }, 5000) // Poll every 5 seconds
      
      // Clear polling after 30 minutes max
      setTimeout(() => {
        clearInterval(pollInterval)
        if (scanLoading) {
          setScanLoading(false)
          setError('Scan timeout - please check job status manually')
        }
      }, 30 * 60 * 1000)
      
    } catch (error) {
      console.error('Daytona scan error:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit scan to Daytona')
      setScanLoading(false)
      setScanProgress(null)
    }
  }

  const handleScanComplete = (scanFollowers: any[]) => {
    setFollowers(scanFollowers)
    setScanLoading(false)
    setScanProgress(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/auth'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Followlytics Dashboard</h1>
              <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Powered by Daytona
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback>
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="text-red-600">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="scan" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scan">Daytona Scan</TabsTrigger>
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Daytona Scan Tab */}
          <TabsContent value="scan" className="space-y-6">
            {!scanProgress ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-500" />
                    Daytona Follower Scanner
                  </CardTitle>
                  <CardDescription>
                    Super-fast follower scanning powered by Daytona cloud infrastructure. 
                    Automatically optimized for any account size from 1K to 50M+ followers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Scan Input */}
                  <div className="flex gap-3">
                    <Input
                      placeholder="Enter Twitter username (e.g., elonmusk)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="flex-1"
                      disabled={scanLoading}
                    />
                    <Button 
                      onClick={handleDaytonaScan}
                      disabled={scanLoading || !username.trim()}
                      className="flex items-center gap-2 min-w-[140px]"
                    >
                      {scanLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" />
                          Start Scan
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Performance Features */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                      <Brain className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-semibold text-blue-900">Smart Optimization</h3>
                        <p className="text-sm text-blue-700">Auto-detects account size and optimizes processing</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                      <Clock className="h-8 w-8 text-green-500" />
                      <div>
                        <h3 className="font-semibold text-green-900">Lightning Fast</h3>
                        <p className="text-sm text-green-700">Up to 50,000 followers per minute</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                      <DollarSign className="h-8 w-8 text-purple-500" />
                      <div>
                        <h3 className="font-semibold text-purple-900">Cost Optimized</h3>
                        <p className="text-sm text-purple-700">Pay only for what you use</p>
                      </div>
                    </div>
                  </div>

                  {/* Account Size Examples */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3">Processing Times by Account Size:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-green-600">Micro (0-10K)</div>
                        <div className="text-gray-600">~2 minutes</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-blue-600">Small (10K-100K)</div>
                        <div className="text-gray-600">~5 minutes</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-purple-600">Medium (100K-1M)</div>
                        <div className="text-gray-600">~15 minutes</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-orange-600">Large (1M-10M)</div>
                        <div className="text-gray-600">~45 minutes</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-600">Mega (10M+)</div>
                        <div className="text-gray-600">~2 hours</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <DaytonaScanProgress 
                scanProgress={scanProgress} 
                onComplete={handleScanComplete}
              />
            )}
          </TabsContent>

          {/* Followers Tab */}
          <TabsContent value="followers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{followers.length.toLocaleString()}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unfollowers</CardTitle>
                  <UserMinus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{unfollowers.length.toLocaleString()}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+2.3%</div>
                </CardContent>
              </Card>
            </div>

            <FollowersList />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <SubscriptionStatus />
              
              <Card>
                <CardHeader>
                  <CardTitle>Daytona Configuration</CardTitle>
                  <CardDescription>
                    Your Daytona-powered scanning is automatically optimized. 
                    No manual configuration needed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-900">Auto-Optimization</div>
                        <div className="text-sm text-green-700">Enabled</div>
                      </div>
                      <div className="text-green-600">✓</div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <div className="font-medium text-blue-900">Cost Monitoring</div>
                        <div className="text-sm text-blue-700">Active</div>
                      </div>
                      <div className="text-blue-600">✓</div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <div className="font-medium text-purple-900">Smart Scaling</div>
                        <div className="text-sm text-purple-700">Enabled</div>
                      </div>
                      <div className="text-purple-600">✓</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
