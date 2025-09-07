'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Crown, 
  Zap, 
  TrendingUp, 
  Users, 
  Brain, 
  Target,
  BarChart3,
  Calendar,
  Globe,
  Shield,
  Sparkles
} from 'lucide-react'

interface UserSubscription {
  tier: 'starter' | 'professional' | 'business' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd: number
  usage: {
    apiCalls: number
    limit: number
    resetDate: string
  }
}

interface AIInsights {
  followerGrowthPrediction: {
    nextMonth: number
    confidence: number
    factors: string[]
  }
  audienceAnalysis: {
    demographics: {
      topLocations: string[]
      ageGroups: { range: string; percentage: number }[]
      interests: string[]
    }
    engagement: {
      averageRate: number
      bestPostingTimes: string[]
      topContentTypes: string[]
    }
  }
  competitorInsights: {
    similarAccounts: Array<{
      username: string
      followerOverlap: number
      growthRate: number
    }>
    opportunities: string[]
  }
}

export default function PremiumFeatures() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptionData()
    fetchAIInsights()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscription/status', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    }
  }

  const fetchAIInsights = async () => {
    try {
      const response = await fetch('/api/ai/insights', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setAIInsights(data)
      }
    } catch (error) {
      console.error('Failed to fetch AI insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'starter': return 'bg-blue-100 text-blue-800'
      case 'professional': return 'bg-purple-100 text-purple-800'
      case 'business': return 'bg-orange-100 text-orange-800'
      case 'enterprise': return 'bg-gold-100 text-gold-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTierFeatures = (tier: string) => {
    const features = {
      starter: ['10K API calls/month', 'Basic analytics', 'Email support'],
      professional: ['100K API calls/month', 'AI insights', 'Real-time monitoring', 'Priority support'],
      business: ['500K API calls/month', 'Team features', 'Advanced analytics', 'Phone support'],
      enterprise: ['Unlimited API calls', 'Custom features', 'Dedicated support', 'White-label options']
    }
    return features[tier as keyof typeof features] || []
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <Card className="border-2 border-gradient-to-r from-purple-500 to-pink-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crown className="h-6 w-6 text-yellow-500" />
              <CardTitle>Premium Subscription</CardTitle>
            </div>
            {subscription && (
              <Badge className={getTierColor(subscription.tier)}>
                {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">API Usage</span>
                <span className="text-sm text-gray-500">
                  {subscription.usage.apiCalls.toLocaleString()} / {subscription.usage.limit.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={(subscription.usage.apiCalls / subscription.usage.limit) * 100} 
                className="w-full"
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-green-600 capitalize">{subscription.status}</p>
                </div>
                <div>
                  <p className="font-medium">Resets</p>
                  <p className="text-gray-600">{subscription.usage.resetDate}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-sm">Current Plan Features:</p>
                <div className="flex flex-wrap gap-2">
                  {getTierFeatures(subscription.tier).map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unlock Premium Features</h3>
              <p className="text-gray-600 mb-4">
                Get AI insights, real-time monitoring, and advanced analytics
              </p>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                Upgrade Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Insights Tabs */}
      {subscription && subscription.tier !== 'starter' && aiInsights && (
        <Tabs defaultValue="growth" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="growth">Growth Insights</TabsTrigger>
            <TabsTrigger value="audience">Audience Analysis</TabsTrigger>
            <TabsTrigger value="competitors">Competitor Intel</TabsTrigger>
          </TabsList>

          <TabsContent value="growth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span>Growth Prediction</span>
                </CardTitle>
                <CardDescription>
                  AI-powered forecast for your follower growth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      +{aiInsights.followerGrowthPrediction.nextMonth.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-500">Predicted followers next month</p>
                    <div className="mt-2">
                      <Badge variant="secondary">
                        {aiInsights.followerGrowthPrediction.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Key Growth Factors:</h4>
                    <ul className="space-y-1">
                      {aiInsights.followerGrowthPrediction.factors.map((factor, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <Target className="h-3 w-3 mr-2 text-blue-500" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    <span>Demographics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Top Locations</h4>
                      <div className="space-y-2">
                        {aiInsights.audienceAnalysis.demographics.topLocations.map((location, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-sm">{location}</span>
                            <Badge variant="outline">{Math.floor(Math.random() * 30 + 10)}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Age Groups</h4>
                      <div className="space-y-2">
                        {aiInsights.audienceAnalysis.demographics.ageGroups.map((group, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-sm">{group.range}</span>
                            <Badge variant="outline">{group.percentage}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    <span>Engagement</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {aiInsights.audienceAnalysis.engagement.averageRate}%
                      </div>
                      <p className="text-sm text-gray-500">Average engagement rate</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Best Posting Times</h4>
                      <div className="flex flex-wrap gap-2">
                        {aiInsights.audienceAnalysis.engagement.bestPostingTimes.map((time, index) => (
                          <Badge key={index} variant="secondary">
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Top Content Types</h4>
                      <div className="space-y-2">
                        {aiInsights.audienceAnalysis.engagement.topContentTypes.map((type, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-sm">{type}</span>
                            <Badge variant="outline">{Math.floor(Math.random() * 20 + 60)}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="competitors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  <span>Similar Accounts</span>
                </CardTitle>
                <CardDescription>
                  Accounts with similar audiences to yours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aiInsights.competitorInsights.similarAccounts.map((account, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">@{account.username}</p>
                        <p className="text-sm text-gray-500">
                          {account.followerOverlap}% follower overlap
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={account.growthRate > 0 ? "default" : "secondary"}
                          className={account.growthRate > 0 ? "bg-green-100 text-green-800" : ""}
                        >
                          {account.growthRate > 0 ? '+' : ''}{account.growthRate}%
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">Growth rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-pink-500" />
                  <span>Growth Opportunities</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiInsights.competitorInsights.opportunities.map((opportunity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Zap className="h-4 w-4 text-blue-500 mt-0.5" />
                      <p className="text-sm">{opportunity}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Upgrade Prompts for Lower Tiers */}
      {subscription && subscription.tier === 'starter' && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <Brain className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unlock AI Insights</h3>
              <p className="text-gray-600 mb-4">
                Get growth predictions, audience analysis, and competitor intelligence
              </p>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                Upgrade to Professional
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
