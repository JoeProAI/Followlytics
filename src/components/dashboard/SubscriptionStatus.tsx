'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Crown, Zap, AlertTriangle } from 'lucide-react'

interface SubscriptionData {
  tier: 'starter' | 'professional' | 'business' | 'enterprise'
  status: 'active' | 'inactive' | 'past_due' | 'canceled'
  currentPeriodEnd?: number
  usage: {
    apiCalls: number
    limit: number
    resetDate: string
  }
}

export default function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
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
    } finally {
      setLoading(false)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'starter': return 'bg-blue-100 text-blue-800'
      case 'professional': return 'bg-purple-100 text-purple-800'
      case 'business': return 'bg-orange-100 text-orange-800'
      case 'enterprise': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTierPrice = (tier: string) => {
    switch (tier) {
      case 'starter': return '$29/month'
      case 'professional': return '$99/month'
      case 'business': return '$299/month'
      case 'enterprise': return '$999/month'
      default: return 'Free'
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!subscription) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-blue-500" />
            <span>Get Started with Premium</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Unlock advanced features with a premium subscription
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Choose Plan
          </Button>
        </CardContent>
      </Card>
    )
  }

  const usagePercentage = (subscription.usage.apiCalls / subscription.usage.limit) * 100
  const isNearLimit = usagePercentage >= 80

  return (
    <Card className={isNearLimit ? "border-yellow-200 bg-yellow-50" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span>Subscription</span>
          </CardTitle>
          <Badge className={getTierColor(subscription.tier)}>
            {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
          </Badge>
        </div>
        <CardDescription>
          {getTierPrice(subscription.tier)} • Status: {subscription.status}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>API Usage</span>
            <span>{subscription.usage.apiCalls.toLocaleString()} / {subscription.usage.limit.toLocaleString()}</span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Resets {subscription.usage.resetDate}
          </p>
        </div>

        {/* Warnings */}
        {isNearLimit && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Usage Warning</p>
              <p className="text-yellow-700">
                You've used {Math.round(usagePercentage)}% of your monthly limit
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {subscription.tier === 'starter' && (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Zap className="mr-2 h-4 w-4" />
              Upgrade
            </Button>
          )}
          <Button variant="outline" size="sm">
            Manage Billing
          </Button>
        </div>

        {/* Tier Benefits */}
        <div className="text-xs text-gray-500">
          <p className="font-medium mb-1">Current plan includes:</p>
          <ul className="space-y-1">
            {subscription.tier === 'starter' && (
              <>
                <li>• 10K API calls/month</li>
                <li>• Basic analytics</li>
                <li>• Email support</li>
              </>
            )}
            {subscription.tier === 'professional' && (
              <>
                <li>• 100K API calls/month</li>
                <li>• AI insights</li>
                <li>• Real-time monitoring</li>
                <li>• Priority support</li>
              </>
            )}
            {subscription.tier === 'business' && (
              <>
                <li>• 500K API calls/month</li>
                <li>• Team features</li>
                <li>• Advanced analytics</li>
                <li>• Phone support</li>
              </>
            )}
            {subscription.tier === 'enterprise' && (
              <>
                <li>• Unlimited API calls</li>
                <li>• Custom features</li>
                <li>• Dedicated support</li>
                <li>• White-label options</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
