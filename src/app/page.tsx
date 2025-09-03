import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, TrendingDown, Brain, Users, Zap, Shield } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="/">
          <TrendingDown className="h-6 w-6 mr-2" />
          <span className="font-bold">Followlytics</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#pricing">
            Pricing
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/dashboard">
            Dashboard
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Track X Followers with
                  <span className="text-primary"> AI Insights</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Monitor your X (Twitter) followers and understand engagement patterns with AI-powered analysis from xAI Grok.
                  Get actionable insights to grow your audience and improve engagement.
                </p>
              </div>
              <div className="space-x-4">
                <Button size="lg" asChild>
                  <Link href="/api/auth/twitter/login">Start Free Trial</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/dashboard">View Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Powerful Features</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Everything you need to track and understand your X follower changes
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card>
                <CardHeader>
                  <Brain className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>AI-Powered Analysis</CardTitle>
                  <CardDescription>
                    Get detailed insights on why people unfollowed you using xAI Grok analysis
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Real-time Tracking</CardTitle>
                  <CardDescription>
                    Monitor follower changes in real-time with smart rate limiting
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Zap className="h-8 w-8 mb-2 text-primary" />
                  <CardTitle>Advanced Analytics</CardTitle>
                  <CardDescription>
                    Detailed charts, trends, and export capabilities for deep insights
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Simple Pricing</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  Choose the plan that fits your needs
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-4 lg:gap-12">
              {/* Free Tier */}
              <Card>
                <CardHeader>
                  <CardTitle>Free</CardTitle>
                  <CardDescription>Perfect for trying out</CardDescription>
                  <div className="text-4xl font-bold">$0</div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      1 Account
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      7 Days History
                    </li>
                    <li className="text-gray-500">No AI Insights</li>
                  </ul>
                  <Button className="w-full" variant="outline">Get Started</Button>
                </CardContent>
              </Card>

              {/* Starter Tier */}
              <Card className="border-primary">
                <CardHeader>
                  <Badge className="w-fit mb-2" variant="default">Most Popular</Badge>
                  <CardTitle>Starter</CardTitle>
                  <CardDescription>For individual creators</CardDescription>
                  <div className="text-4xl font-bold">$19<span className="text-sm font-normal">/mo</span></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      1 Account
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      30 Days History
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      AI Insights
                    </li>
                  </ul>
                  <Button className="w-full">Start Free Trial</Button>
                </CardContent>
              </Card>

              {/* Professional Tier */}
              <Card>
                <CardHeader>
                  <CardTitle>Professional</CardTitle>
                  <CardDescription>For growing businesses</CardDescription>
                  <div className="text-4xl font-bold">$49<span className="text-sm font-normal">/mo</span></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      3 Accounts
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      90 Days History
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      AI Insights + Webhooks
                    </li>
                  </ul>
                  <Button className="w-full" variant="outline">Start Free Trial</Button>
                </CardContent>
              </Card>

              {/* Agency Tier */}
              <Card>
                <CardHeader>
                  <CardTitle>Agency</CardTitle>
                  <CardDescription>For agencies & teams</CardDescription>
                  <div className="text-4xl font-bold">$149<span className="text-sm font-normal">/mo</span></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      10 Accounts
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      365 Days History
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Full Features + API
                    </li>
                  </ul>
                  <Button className="w-full" variant="outline">Contact Sales</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © 2024 Followlytics. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
