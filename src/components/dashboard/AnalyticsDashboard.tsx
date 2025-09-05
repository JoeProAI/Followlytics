'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  UserMinus, 
  UserPlus, 
  Activity,
  Calendar,
  Target,
  Zap,
  Crown,
  Lock
} from 'lucide-react'
import PricingModal from './PricingModal'

interface FollowerData {
  id: string
  username: string
  name: string
  profile_image_url: string
  followers_count: number
  verified: boolean
}

interface UnfollowerData {
  unfollowers: FollowerData[]
  new_followers: FollowerData[]
  summary: {
    unfollowers_count: number
    new_followers_count: number
    net_change: number
    current_followers: number
    previous_followers: number
  }
  timestamps: {
    current_scan: string
    previous_scan: string
  }
}

interface AnalyticsData {
  totalFollowers: number
  followersGrowth: number
  unfollowersToday: number
  newFollowersToday: number
  engagementRate: number
  topFollowers: FollowerData[]
  recentUnfollowers: FollowerData[]
  growthTrend: Array<{ date: string; followers: number }>
}

export default function AnalyticsDashboard() {
  const [unfollowerData, setUnfollowerData] = useState<UnfollowerData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showPricingModal, setShowPricingModal] = useState(false)

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      let unfollowerResult: any = { unfollowers: [], summary: {} }
      
      try {
        const response = await fetch('/api/unfollowers', {
          credentials: 'include'
        })
        
        if (response.ok) {
          unfollowerResult = await response.json()
        }
      } catch (error) {
        console.error('Analytics fetch error:', error)
      }

      // Mock analytics data for now - will be replaced with real API
      const mockAnalytics: AnalyticsData = {
        totalFollowers: unfollowerResult?.summary?.current_followers || 0,
        followersGrowth: unfollowerResult?.summary?.net_change || 0,
        unfollowersToday: unfollowerResult?.unfollowers?.length || 0,
        newFollowersToday: unfollowerResult?.summary?.new_followers_count || 0,
        engagementRate: 4.2,
        topFollowers: unfollowerResult.new_followers?.slice(0, 5) || [],
        recentUnfollowers: unfollowerResult.unfollowers?.slice(0, 5) || [],
        growthTrend: [
          { date: '7 days ago', followers: (unfollowerResult.summary?.current_followers || 1000) - 50 },
          { date: '6 days ago', followers: (unfollowerResult.summary?.current_followers || 1000) - 40 },
          { date: '5 days ago', followers: (unfollowerResult.summary?.current_followers || 1000) - 30 },
          { date: '4 days ago', followers: (unfollowerResult.summary?.current_followers || 1000) - 20 },
          { date: '3 days ago', followers: (unfollowerResult.summary?.current_followers || 1000) - 10 },
          { date: '2 days ago', followers: (unfollowerResult.summary?.current_followers || 1000) - 5 },
          { date: 'Today', followers: unfollowerResult.summary?.current_followers || 1000 }
        ]
      }
      setAnalyticsData(mockAnalytics)

    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchAnalyticsData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analyticsData?.totalFollowers || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData?.followersGrowth && analyticsData.followersGrowth > 0 ? '+' : ''}
              {analyticsData?.followersGrowth || 0} from last scan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Followers</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{analyticsData?.newFollowersToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">Since last scan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unfollowers</CardTitle>
            <UserMinus className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{analyticsData?.unfollowersToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">Since last scan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Growth</CardTitle>
            {(analyticsData?.followersGrowth || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (analyticsData?.followersGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {analyticsData?.followersGrowth && analyticsData.followersGrowth > 0 ? '+' : ''}
              {analyticsData?.followersGrowth || 0}
            </div>
            <p className="text-xs text-muted-foreground">Net change</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="unfollowers">Unfollowers</TabsTrigger>
          <TabsTrigger value="new-followers">New Followers</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Growth Trend</CardTitle>
                <CardDescription>Follower count over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsData?.growthTrend.map((point, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{point.date}</span>
                      <span className="font-medium">{formatNumber(point.followers)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Engagement Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {analyticsData?.engagementRate}%
                    </span>
                  </div>
                  <Progress value={analyticsData?.engagementRate || 0} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round((analyticsData?.newFollowersToday || 0) / 7)}
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Daily Growth</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(((analyticsData?.newFollowersToday || 0) / (analyticsData?.totalFollowers || 1)) * 100 * 100) / 100}%
                    </div>
                    <p className="text-xs text-muted-foreground">Growth Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {unfollowerData?.timestamps && (
            <Card>
              <CardHeader>
                <CardTitle>Last Scan Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Current Scan</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(unfollowerData.timestamps.current_scan)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Previous Scan</p>
                    <p className="text-sm text-muted-foreground">
                      {unfollowerData.timestamps.previous_scan 
                        ? formatDate(unfollowerData.timestamps.previous_scan)
                        : 'No previous scan'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unfollowers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-red-600" />
                Recent Unfollowers ({unfollowerData?.unfollowers.length || 0})
              </CardTitle>
              <CardDescription>
                People who unfollowed you since the last scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unfollowerData?.unfollowers.length ? (
                <div className="space-y-4">
                  {unfollowerData.unfollowers.map((unfollower) => (
                    <div key={unfollower.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <Avatar>
                        <AvatarImage src={unfollower.profile_image_url} />
                        <AvatarFallback>{unfollower.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{unfollower.name}</p>
                          {unfollower.verified && (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">@{unfollower.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(unfollower.followers_count)} followers
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://twitter.com/${unfollower.username}`, '_blank')}
                      >
                        View Profile
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserMinus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No unfollowers detected</p>
                  <p className="text-sm text-muted-foreground">Great job keeping your audience engaged!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new-followers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-600" />
                New Followers ({unfollowerData?.new_followers.length || 0})
              </CardTitle>
              <CardDescription>
                People who started following you since the last scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unfollowerData?.new_followers.length ? (
                <div className="space-y-4">
                  {unfollowerData.new_followers.map((follower) => (
                    <div key={follower.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <Avatar>
                        <AvatarImage src={follower.profile_image_url} />
                        <AvatarFallback>{follower.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{follower.name}</p>
                          {follower.verified && (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">@{follower.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(follower.followers_count)} followers
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://twitter.com/${follower.username}`, '_blank')}
                      >
                        View Profile
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No new followers detected</p>
                  <p className="text-sm text-muted-foreground">Keep creating great content to attract new followers!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription>
                Unlock advanced AI analysis with Grok integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="relative">
                  <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <p className="font-medium mb-2">Premium AI Insights</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Get intelligent analysis of your follower patterns, optimal posting times, 
                  content recommendations, and competitor insights powered by Grok AI.
                </p>
                <div className="space-y-3 mb-6 text-left max-w-md mx-auto">
                  <div className="flex items-center text-sm">
                    <Crown className="h-4 w-4 text-yellow-600 mr-2" />
                    Follower behavior analysis
                  </div>
                  <div className="flex items-center text-sm">
                    <Crown className="h-4 w-4 text-yellow-600 mr-2" />
                    Optimal posting time recommendations
                  </div>
                  <div className="flex items-center text-sm">
                    <Crown className="h-4 w-4 text-yellow-600 mr-2" />
                    Content strategy insights
                  </div>
                  <div className="flex items-center text-sm">
                    <Crown className="h-4 w-4 text-yellow-600 mr-2" />
                    Competitor follower analysis
                  </div>
                </div>
                <Button onClick={() => setShowPricingModal(true)} className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={fetchAnalyticsData} disabled={loading}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh Analytics
        </Button>
      </div>

      {/* Pricing Modal */}
      <PricingModal 
        isOpen={showPricingModal} 
        onClose={() => setShowPricingModal(false)} 
      />
    </div>
  )
}
