'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, TrendingDown } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { SUBSCRIPTION_TIERS } from "@/lib/stripe"

export default function PricingPage() {
  const { user } = useAuth()

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      window.location.href = '/auth/login'
      return
    }

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
        }),
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Subscription error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="px-4 lg:px-6 h-14 flex items-center border-b bg-white">
        <Link className="flex items-center justify-center" href="/">
          <TrendingDown className="h-6 w-6 mr-2" />
          <span className="font-bold">Followlytics</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/">
            Home
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/dashboard">
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start tracking unfollows for free, then upgrade for AI insights and advanced features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {/* Free Tier */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Perfect for trying out</CardDescription>
              <div className="text-4xl font-bold">$0</div>
              <p className="text-sm text-gray-500">Forever free</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">1 Account</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">7 Days History</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">Basic Tracking</span>
                </li>
                <li className="text-sm text-gray-400">No AI Insights</li>
                <li className="text-sm text-gray-400">No Export</li>
              </ul>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/auth/login">Get Started</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Starter Tier */}
          <Card className="relative border-primary shadow-lg">
            <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-500">
              Most Popular
            </Badge>
            <CardHeader>
              <CardTitle className="text-2xl">Starter</CardTitle>
              <CardDescription>For individual creators</CardDescription>
              <div className="text-4xl font-bold">
                $29<span className="text-lg font-normal text-gray-500">/mo</span>
              </div>
              <p className="text-sm text-gray-500">10K API calls • Real-time tracking</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">1 Account</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">30 Days History</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">AI Insights with Grok</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">Export Data</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">Email Support</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                onClick={() => handleSubscribe(SUBSCRIPTION_TIERS.starter.priceId)}
              >
                Start Free Trial
              </Button>
            </CardContent>
          </Card>

          {/* Professional Tier */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Professional</CardTitle>
              <CardDescription>For growing businesses</CardDescription>
              <div className="text-4xl font-bold">
                $49<span className="text-lg font-normal text-gray-500">/mo</span>
              </div>
              <p className="text-sm text-gray-500">Billed monthly</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">3 Accounts</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">90 Days History</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">AI Insights + Trends</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">Webhook Notifications</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">Priority Support</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleSubscribe(SUBSCRIPTION_TIERS.professional.priceId)}
              >
                Start Free Trial
              </Button>
            </CardContent>
          </Card>

          {/* Agency Tier */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Agency</CardTitle>
              <CardDescription>For agencies & teams</CardDescription>
              <div className="text-4xl font-bold">
                $149<span className="text-lg font-normal text-gray-500">/mo</span>
              </div>
              <p className="text-sm text-gray-500">Billed monthly</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">10 Accounts</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">365 Days History</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">Full AI Suite</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">API Access</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                  <span className="text-sm">Dedicated Support</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleSubscribe(SUBSCRIPTION_TIERS.agency.priceId)}
              >
                Contact Sales
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How does the AI analysis work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We use xAI's Grok model to analyze your recent tweets and identify patterns that may have led to unfollows. 
                  The AI considers factors like content tone, posting frequency, controversial topics, and engagement patterns.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes, we only access public follower information and never post on your behalf. All data is encrypted and stored securely. 
                  We comply with GDPR and other privacy regulations.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Absolutely! You can cancel your subscription at any time from your dashboard. 
                  You'll continue to have access to premium features until the end of your billing period.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
