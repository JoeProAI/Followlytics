'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Zap, 
  Target,
  BarChart3,
  Globe,
  Crown,
  Sparkles,
  UserMinus,
  UserPlus,
  Eye,
  MessageCircle,
  Heart,
  Repeat2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Star
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

// Mock data for demo
const followerGrowthData = [
  { date: '2024-01-01', followers: 12450, unfollowers: 23 },
  { date: '2024-01-02', followers: 12467, unfollowers: 15 },
  { date: '2024-01-03', followers: 12489, unfollowers: 8 },
  { date: '2024-01-04', followers: 12512, unfollowers: 12 },
  { date: '2024-01-05', followers: 12534, unfollowers: 19 },
  { date: '2024-01-06', followers: 12556, unfollowers: 7 },
  { date: '2024-01-07', followers: 12578, unfollowers: 11 }
]

const engagementData = [
  { time: '6AM', engagement: 2.1 },
  { time: '9AM', engagement: 4.5 },
  { time: '12PM', engagement: 6.8 },
  { time: '3PM', engagement: 8.2 },
  { time: '6PM', engagement: 9.5 },
  { time: '9PM', engagement: 7.3 },
  { time: '12AM', engagement: 3.1 }
]

const audienceData = [
  { name: 'Tech Enthusiasts', value: 35, color: '#8884d8' },
  { name: 'Entrepreneurs', value: 28, color: '#82ca9d' },
  { name: 'Developers', value: 22, color: '#ffc658' },
  { name: 'Marketers', value: 15, color: '#ff7c7c' }
]

const competitorData = [
  { name: '@elonmusk', followers: 156000000, growth: 2.3, overlap: 15 },
  { name: '@sundarpichai', followers: 5200000, growth: 1.8, overlap: 23 },
  { name: '@satyanadella', followers: 2800000, growth: 3.1, overlap: 18 },
  { name: '@tim_cook', followers: 15600000, growth: 1.2, overlap: 12 }
]

const recentUnfollowers = [
  { name: 'Alex Johnson', username: 'alexj_dev', followers: 15600, reason: 'Inactive for 30+ days', avatar: '👨‍💻' },
  { name: 'Sarah Chen', username: 'sarahc_design', followers: 8900, reason: 'Content mismatch', avatar: '👩‍🎨' },
  { name: 'Mike Rodriguez', username: 'mike_startup', followers: 23400, reason: 'Following cleanup', avatar: '🚀' },
  { name: 'Emma Wilson', username: 'emmaw_writer', followers: 5600, reason: 'Topic shift detected', avatar: '✍️' }
]

const aiInsights = [
  { type: 'warning', title: 'Posting Frequency Alert', message: 'Your posting frequency decreased 40% this week. Consider maintaining 3-5 posts daily for optimal engagement.' },
  { type: 'success', title: 'Content Performance', message: 'Tech tutorials are performing 230% better than average. Focus more on educational content.' },
  { type: 'info', title: 'Optimal Timing', message: 'Your audience is most active between 6-9 PM EST. Schedule important posts during this window.' },
  { type: 'opportunity', title: 'Growth Opportunity', message: 'Engaging with @sundarpichai followers could increase your reach by 15-20%.' }
]

export default function DemoPage() {
  const [activeDemo, setActiveDemo] = useState('overview')
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)

  const simulateScan = () => {
    setIsScanning(true)
    setScanProgress(0)
    
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsScanning(false)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 200)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Crown className="h-12 w-12 mr-4 text-yellow-300" />
              <h1 className="text-5xl font-bold">Followlytics Demo</h1>
            </div>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Experience the most advanced Twitter analytics platform. See exactly who unfollowed you, 
              why they left, and how to grow your audience with AI-powered insights.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Badge className="bg-yellow-500 text-black px-4 py-2 text-lg">
                <Sparkles className="mr-2 h-5 w-5" />
                Live Demo Account
              </Badge>
              <Badge className="bg-green-500 text-white px-4 py-2 text-lg">
                <Zap className="mr-2 h-5 w-5" />
                Real-Time Data
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Demo Navigation */}
        <Tabs value={activeDemo} onValueChange={setActiveDemo} className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-lg">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="unfollowers" className="flex items-center space-x-2">
              <UserMinus className="h-4 w-4" />
              <span>Unfollowers</span>
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>AI Insights</span>
            </TabsTrigger>
            <TabsTrigger value="competitors" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Competitors</span>
            </TabsTrigger>
            <TabsTrigger value="live-scan" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Live Scan</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                  <Users className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12,578</div>
                  <p className="text-xs opacity-80">
                    <TrendingUp className="inline h-3 w-3 mr-1" />
                    +2.4% from last week
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unfollowers (7d)</CardTitle>
                  <UserMinus className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">95</div>
                  <p className="text-xs opacity-80">
                    <TrendingDown className="inline h-3 w-3 mr-1" />
                    -15% from last week
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                  <Heart className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.8%</div>
                  <p className="text-xs opacity-80">
                    <TrendingUp className="inline h-3 w-3 mr-1" />
                    +0.8% from last week
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Score</CardTitle>
                  <Brain className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8.7/10</div>
                  <p className="text-xs opacity-80">
                    <Star className="inline h-3 w-3 mr-1" />
                    Excellent performance
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Follower Growth Trend</CardTitle>
                  <CardDescription>Last 7 days performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={followerGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="followers" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audience Composition</CardTitle>
                  <CardDescription>Based on AI analysis of followers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={audienceData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {audienceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Engagement Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Optimal Posting Times</CardTitle>
                <CardDescription>AI-analyzed engagement patterns throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="engagement" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unfollowers Tab */}
          <TabsContent value="unfollowers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserMinus className="h-5 w-5 text-red-500" />
                  <span>Recent Unfollowers</span>
                  <Badge variant="destructive">95 this week</Badge>
                </CardTitle>
                <CardDescription>
                  AI-powered analysis of why people unfollowed you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUnfollowers.map((unfollower, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">{unfollower.avatar}</div>
                        <div>
                          <p className="font-medium">{unfollower.name}</p>
                          <p className="text-sm text-gray-500">@{unfollower.username}</p>
                          <p className="text-xs text-gray-400">{unfollower.followers.toLocaleString()} followers</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-2">
                          {unfollower.reason}
                        </Badge>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Unfollow Reasons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Unfollow Reasons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Inactive content</span>
                      <span className="text-sm font-medium">32%</span>
                    </div>
                    <Progress value={32} className="h-2" />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Content mismatch</span>
                      <span className="text-sm font-medium">28%</span>
                    </div>
                    <Progress value={28} className="h-2" />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Following cleanup</span>
                      <span className="text-sm font-medium">25%</span>
                    </div>
                    <Progress value={25} className="h-2" />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Topic shift</span>
                      <span className="text-sm font-medium">15%</span>
                    </div>
                    <Progress value={15} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Follower Quality</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">87%</div>
                      <p className="text-sm text-gray-500">High-quality followers</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Real accounts</span>
                        <span className="font-medium">94%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Active users</span>
                        <span className="font-medium">89%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Engaged followers</span>
                        <span className="font-medium">76%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Retention Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">92.4%</div>
                      <p className="text-sm text-gray-500">30-day retention</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>7 days</span>
                        <span className="font-medium text-green-600">98.2%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>30 days</span>
                        <span className="font-medium text-blue-600">92.4%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>90 days</span>
                        <span className="font-medium text-yellow-600">85.1%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {aiInsights.map((insight, index) => (
                <Card key={index} className={`border-l-4 ${
                  insight.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
                  insight.type === 'success' ? 'border-l-green-500 bg-green-50' :
                  insight.type === 'info' ? 'border-l-blue-500 bg-blue-50' :
                  'border-l-purple-500 bg-purple-50'
                }`}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {insight.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                      {insight.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {insight.type === 'info' && <Brain className="h-5 w-5 text-blue-600" />}
                      {insight.type === 'opportunity' && <Sparkles className="h-5 w-5 text-purple-600" />}
                      <span className="text-lg">{insight.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{insight.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* AI Growth Prediction */}
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-6 w-6" />
                  <span>AI Growth Prediction</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">+1,247</div>
                    <p className="text-sm opacity-80">Predicted followers next month</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">89%</div>
                    <p className="text-sm opacity-80">Confidence level</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">+9.9%</div>
                    <p className="text-sm opacity-80">Growth rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Competitors Tab */}
          <TabsContent value="competitors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Competitor Analysis</span>
                </CardTitle>
                <CardDescription>
                  AI-powered insights on similar accounts in your niche
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {competitorData.map((competitor, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {competitor.name.charAt(1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{competitor.name}</p>
                          <p className="text-sm text-gray-500">{competitor.followers.toLocaleString()} followers</p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant={competitor.growth > 2 ? "default" : "secondary"}>
                          +{competitor.growth}% growth
                        </Badge>
                        <p className="text-xs text-gray-500">{competitor.overlap}% follower overlap</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Scan Tab */}
          <TabsContent value="live-scan" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Live Follower Scan</span>
                </CardTitle>
                <CardDescription>
                  Real-time scanning of your followers using advanced scraping technology
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <Button 
                    onClick={simulateScan} 
                    disabled={isScanning}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-3 text-lg"
                  >
                    {isScanning ? (
                      <>
                        <Zap className="mr-2 h-5 w-5 animate-spin" />
                        Scanning... {Math.round(scanProgress)}%
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-5 w-5" />
                        Start Live Scan
                      </>
                    )}
                  </Button>
                </div>

                {isScanning && (
                  <div className="space-y-4">
                    <Progress value={scanProgress} className="w-full h-3" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{Math.round(scanProgress * 125)}</div>
                        <p className="text-sm text-gray-500">Followers Scanned</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">{Math.round(scanProgress * 0.8)}</div>
                        <p className="text-sm text-gray-500">New Unfollowers</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{Math.round(scanProgress * 1.2)}</div>
                        <p className="text-sm text-gray-500">New Followers</p>
                      </div>
                    </div>
                  </div>
                )}

                {scanProgress === 100 && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-green-800 mb-2">Scan Complete!</h3>
                        <p className="text-green-700">
                          Found 12,578 followers, 8 new unfollowers, and 15 new followers since last scan.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA Section */}
        <Card className="mt-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to unlock these insights for your account?</h2>
              <p className="text-xl mb-6 opacity-90">
                Start with our free tier or upgrade to Professional for AI-powered analytics
              </p>
              <div className="flex items-center justify-center space-x-4">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  Start Free Trial
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                  View Pricing
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
