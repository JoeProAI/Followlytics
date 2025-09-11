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
  const [scanProgress, setScanProgress] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanResults, setScanResults] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [twitterAuthorized, setTwitterAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  // Fetch existing followers on component mount
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchExistingFollowers()
      // Check if user is already Twitter authorized
      checkTwitterAuthStatus()
    }
  }, [isAuthenticated, user])

  // Check URL params for Twitter auth success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('twitter_auth') === 'success') {
      setTwitterAuthorized(true)
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  const checkTwitterAuthStatus = async () => {
    try {
      // Check if user has Twitter tokens stored
      const response = await fetch('/api/auth/twitter/status', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setTwitterAuthorized(data.authorized || false)
      }
    } catch (error) {
      console.log('Twitter auth status check failed:', error)
    }
  }

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

  const handleTwitterAuth = async () => {
    setAuthLoading(true)
    setError(null)
    
    try {
      console.log('🔐 Initiating Twitter OAuth...')
      
      const response = await fetch('/api/auth/twitter', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initialize Twitter OAuth')
      }
      
      const data = await response.json()
      
      if (data.success && data.authUrl) {
        // Store token secret in cookie for callback
        document.cookie = `twitter_oauth_token_secret=${data.oauth_token_secret}; path=/; max-age=600; SameSite=Lax`
        
        // Redirect to Twitter authorization
        window.location.href = data.authUrl
      } else {
        throw new Error('Invalid OAuth response')
      }
      
    } catch (error) {
      console.error('❌ Twitter OAuth failed:', error)
      setError(error instanceof Error ? error.message : 'Twitter authorization failed')
      setAuthLoading(false)
    }
  }

  const handleDaytonaScan = async () => {
    if (!username.trim()) {
      setError('Please enter a Twitter username')
      return
    }

    if (!twitterAuthorized) {
      setError('Please authorize Twitter access first')
      return
    }

    try {
      console.log('Starting Daytona scan for:', username)
      console.log('API endpoint:', '/api/scan/daytona')
      console.log('Request payload:', {
        username: username.replace('@', '').trim(),
        estimated_followers: 800,
        priority: 'normal',
        user_id: user?.uid
      })
      console.log('Full request payload JSON:', JSON.stringify({
        username: username.replace('@', '').trim(),
        estimated_followers: 800,
        priority: 'normal',
        user_id: user?.uid
      }, null, 2))
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
          estimated_followers: 800, // Your actual follower count
          priority: 'normal',
          user_id: user?.uid
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          url: response.url
        })
        console.error('Full API Error Data:', JSON.stringify(errorData, null, 2))
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
              setIsScanning(false)
              if (statusData.results) {
                console.log('📊 Raw scan results received:', statusData.results)
                console.log('📊 Followers array:', statusData.results.followers)
                console.log('📊 Total followers:', statusData.results.total_followers)
                
                setScanResults(statusData.results)
                // Update followers list for the Followers tab
                if (statusData.results.followers && statusData.results.followers.length > 0) {
                  setFollowers(statusData.results.followers)
                  console.log('✅ Updated followers state with', statusData.results.followers.length, 'followers')
                } else {
                  console.log('⚠️ No followers found in results')
                }
                console.log('✅ Scan completed with results:', statusData.results)
              } else {
                console.log('⚠️ No results object in completed status')
              }
              console.log('✅ Scan completed successfully:', statusData)
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval)
              setIsScanning(false)
              
              // Extract detailed error information
              const errorMessage = statusData.error || statusData.message || 'Unknown scan failure'
              const errorDetails = statusData.details || ''
              const fullError = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage
              
              setScanError(fullError)
              console.error('❌ Scan failed with details:', {
                status: statusData.status,
                error: statusData.error,
                message: statusData.message,
                details: statusData.details,
                phase: statusData.phase,
                progress: statusData.progress,
                fullStatusData: statusData
              })
              
              // Log individual error components for easier debugging
              console.error('❌ Error message:', statusData.error)
              console.error('❌ Error details:', statusData.details)
              console.error('❌ Phase when failed:', statusData.phase)
              console.error('❌ Progress when failed:', statusData.progress)
              console.error('❌ Full status object:', JSON.stringify(statusData, null, 2))
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
      console.error('❌ Scan failed:', error)
      
      // Enhanced error logging for debugging
      if (error && typeof error === 'object') {
        console.error('Error object keys:', Object.keys(error))
        console.error('Error details:', JSON.stringify(error, null, 2))
        
        // Check if it's a fetch response error
        if ('response' in error) {
          console.error('Response status:', (error as any).response?.status)
          console.error('Response text:', (error as any).response?.text)
        }
        
        // Check if it has error details from our API
        if ('details' in error) {
          console.error('API error details:', (error as any).details)
        }
        
        if ('stack' in error) {
          console.error('API error stack:', (error as any).stack)
        }
      }
      
      console.error('Full error details:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        type: typeof error,
        constructor: error?.constructor?.name
      })
      
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
          <TabsList className={`grid w-full ${followers.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="scan">Daytona Scan</TabsTrigger>
            {followers.length > 0 && <TabsTrigger value="followers">Followers</TabsTrigger>}
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
                  {/* Twitter Authorization Step */}
                  {!twitterAuthorized ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
                          <h3 className="font-semibold text-blue-900">Authorize Twitter Access</h3>
                        </div>
                        <p className="text-blue-700 mb-4">
                          To scan your followers, you need to authorize Followlytics to access your Twitter account. 
                          This is secure and you can revoke access anytime.
                        </p>
                        <Button 
                          onClick={handleTwitterAuth}
                          disabled={authLoading}
                          className="flex items-center gap-2"
                        >
                          {authLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Connecting to Twitter...
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                              </svg>
                              Authorize Twitter Access
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Twitter Authorization Success */}
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">✓</div>
                          <h3 className="font-semibold text-green-900">Twitter Access Authorized</h3>
                        </div>
                        <p className="text-green-700">
                          Great! You can now scan any Twitter account for followers.
                        </p>
                      </div>

                      {/* Scan Input */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
                          <h3 className="font-semibold text-gray-900">Start Your Scan</h3>
                        </div>
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
                      </div>
                    </div>
                  )}

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
                onComplete={(followers) => {
                  console.log('Scan completed with followers:', followers)
                  setFollowers(followers)
                  setScanResults({ followers, total_followers: followers.length })
                }}
              />
            )}

            {/* Display Scan Results */}
            {scanResults && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Scan Results
                  </CardTitle>
                  <CardDescription>
                    Latest follower scan completed successfully
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {scanResults.total_followers?.toLocaleString() || 
                         (scanResults.followers && scanResults.followers.length > 0 ? scanResults.followers.length.toLocaleString() : '0')}
                      </div>
                      <div className="text-sm text-blue-600">Total Followers</div>
                    </div>
                    {scanResults.ai_analysis && (
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          <Brain className="h-6 w-6 mx-auto" />
                        </div>
                        <div className="text-sm text-purple-600">AI Analysis Available</div>
                      </div>
                    )}
                    {scanResults.metrics && (
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          ✓
                        </div>
                        <div className="text-sm text-green-600">Metrics Generated</div>
                      </div>
                    )}
                  </div>
                  
                  {scanResults.ai_analysis && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">AI Analysis Summary</h4>
                      <p className="text-sm text-gray-700">
                        {typeof scanResults.ai_analysis === 'string' 
                          ? scanResults.ai_analysis 
                          : JSON.stringify(scanResults.ai_analysis, null, 2)
                        }
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    {scanResults.followers && scanResults.followers.length > 0 && (
                      <Button 
                        onClick={() => {
                          setFollowers(scanResults.followers)
                          console.log('🔄 Manually updated followers list with', scanResults.followers.length, 'followers')
                        }}
                        className="flex items-center gap-2"
                      >
                        <Users className="h-4 w-4" />
                        View Followers List ({scanResults.followers.length})
                      </Button>
                    )}
                    {scanResults.ai_analysis && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          // Navigate to analytics with AI data
                          console.log('AI Analysis:', scanResults.ai_analysis)
                        }}
                        className="flex items-center gap-2"
                      >
                        <Brain className="h-4 w-4" />
                        View AI Insights
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
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

            <FollowersList scanResults={scanResults} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard scanResults={scanResults} />
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
