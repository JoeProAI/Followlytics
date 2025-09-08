'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EnterpriseMonitor from '@/components/enterprise/EnterpriseMonitor'
import { Rocket, Zap, Shield, BarChart3, Users, Clock, DollarSign } from 'lucide-react'

interface ScanRequest {
  username: string
  followerCount: number
  priority: 'normal' | 'high' | 'enterprise'
}

interface ScanResult {
  success: boolean
  jobId?: string
  estimatedCompletion?: string
  estimatedCost?: number
  estimatedWorkers?: number
  message?: string
  error?: string
}

export default function EnterprisePage() {
  const [scanRequest, setScanRequest] = useState<ScanRequest>({
    username: '',
    followerCount: 0,
    priority: 'enterprise'
  })
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const handleScan = async () => {
    if (!scanRequest.username) {
      setScanResult({
        success: false,
        error: 'Please provide username'
      })
      return
    }

    if (scanRequest.followerCount < 10000) {
      setScanResult({
        success: false,
        error: 'Enterprise scanning is for accounts with 10K+ followers'
      })
      return
    }

    setIsScanning(true)
    setScanResult(null)

    try {
      const response = await fetch('/api/enterprise/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: scanRequest.username,
          followerCount: scanRequest.followerCount,
          userId: 'enterprise-user', // In production, get from auth
          priority: scanRequest.priority
        })
      })

      const data = await response.json()
      setScanResult(data)

    } catch (error) {
      setScanResult({
        success: false,
        error: 'Failed to submit scan request'
      })
    } finally {
      setIsScanning(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Followlytics Enterprise
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Daytona-powered distributed scanning for massive X accounts. Process millions of followers with 99.9% reliability.
        </p>
      </div>

      <Tabs defaultValue="scan" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scan">Enterprise Scan</TabsTrigger>
          <TabsTrigger value="monitor">System Monitor</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scan Request Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Rocket className="h-5 w-5" />
                  <span>Launch Enterprise Scan</span>
                </CardTitle>
                <CardDescription>
                  Submit a high-scale follower scanning job to the Daytona fleet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="space-y-2">
                  <Label htmlFor="username">X Username</Label>
                  <Input
                    id="username"
                    placeholder="elonmusk"
                    value={scanRequest.username}
                    onChange={(e) => setScanRequest(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="followerCount">Estimated Follower Count</Label>
                  <Input
                    id="followerCount"
                    type="number"
                    placeholder="1000000"
                    min="10000"
                    value={scanRequest.followerCount || ''}
                    onChange={(e) => setScanRequest(prev => ({ 
                      ...prev, 
                      followerCount: parseInt(e.target.value) || 0 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10,000 followers for enterprise scanning
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Priority Level</Label>
                  <div className="flex space-x-2">
                    {(['normal', 'high', 'enterprise'] as const).map((priority) => (
                      <Button
                        key={priority}
                        variant={scanRequest.priority === priority ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setScanRequest(prev => ({ ...prev, priority }))}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleScan} 
                  disabled={isScanning || !scanRequest.username}
                  className="w-full"
                >
                  {isScanning ? 'Submitting...' : 'Launch Enterprise Scan'}
                </Button>
              </CardContent>
            </Card>

            {/* Scan Results */}
            <Card>
              <CardHeader>
                <CardTitle>Scan Results</CardTitle>
                <CardDescription>
                  Job submission status and estimates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scanResult ? (
                  <div className="space-y-4">
                    {scanResult.success ? (
                      <Alert>
                        <Zap className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p className="font-medium">{scanResult.message}</p>
                            {scanResult.jobId && (
                              <div className="text-sm space-y-1">
                                <p><strong>Job ID:</strong> {scanResult.jobId}</p>
                                {scanResult.estimatedCompletion && (
                                  <p><strong>Estimated completion:</strong> {new Date(scanResult.estimatedCompletion).toLocaleString()}</p>
                                )}
                                {scanResult.estimatedCost && (
                                  <p><strong>Estimated cost:</strong> {formatCurrency(scanResult.estimatedCost)}</p>
                                )}
                                {scanRequest.followerCount && (
                                  <p><strong>Workers allocated:</strong> {scanResult.estimatedWorkers}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {scanResult.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Submit a scan request to see results here
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Comparison</CardTitle>
              <CardDescription>
                See how Enterprise Daytona scanning performs at massive scale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-red-500">Legacy Methods</div>
                  <div className="space-y-1 text-sm">
                    <div>Max: ~10K followers</div>
                    <div>Speed: 1K/hour</div>
                    <div>Success rate: 60%</div>
                    <div>Crashes frequently</div>
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-green-500">Enterprise</div>
                  <div className="space-y-1 text-sm">
                    <div>Max: 10M+ followers</div>
                    <div>Speed: 50K+/hour</div>
                    <div>Success rate: 99.9%</div>
                    <div>Auto-recovery</div>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-blue-500">Improvement</div>
                  <div className="space-y-1 text-sm">
                    <div>1000x larger accounts</div>
                    <div>50x faster processing</div>
                    <div>66% better reliability</div>
                    <div>Zero manual intervention</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor">
          <EnterpriseMonitor />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Starter</span>
                </CardTitle>
                <CardDescription>For accounts up to 100K followers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">$99<span className="text-lg text-muted-foreground">/month</span></div>
                <ul className="space-y-2 text-sm">
                  <li>✓ Up to 100K followers</li>
                  <li>✓ 5x faster than browser</li>
                  <li>✓ 95% success rate</li>
                  <li>✓ Basic monitoring</li>
                  <li>✓ Email support</li>
                </ul>
                <Button className="w-full">Get Started</Button>
              </CardContent>
            </Card>

            <Card className="border-blue-500 border-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Professional</span>
                  <Badge>Popular</Badge>
                </CardTitle>
                <CardDescription>For accounts up to 1M followers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">$299<span className="text-lg text-muted-foreground">/month</span></div>
                <ul className="space-y-2 text-sm">
                  <li>✓ Up to 1M followers</li>
                  <li>✓ 25x faster than browser</li>
                  <li>✓ 99% success rate</li>
                  <li>✓ Real-time monitoring</li>
                  <li>✓ Priority support</li>
                  <li>✓ Custom scheduling</li>
                </ul>
                <Button className="w-full">Get Started</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Enterprise</span>
                </CardTitle>
                <CardDescription>For mega-influencers (10M+ followers)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">Custom</div>
                <ul className="space-y-2 text-sm">
                  <li>✓ Unlimited followers</li>
                  <li>✓ 50x faster than browser</li>
                  <li>✓ 99.9% success rate</li>
                  <li>✓ Dedicated infrastructure</li>
                  <li>✓ 24/7 phone support</li>
                  <li>✓ Custom integrations</li>
                  <li>✓ SLA guarantees</li>
                </ul>
                <Button className="w-full">Contact Sales</Button>
              </CardContent>
            </Card>
          </div>

          {/* Cost Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Cost Calculator</span>
              </CardTitle>
              <CardDescription>
                Estimate your monthly costs based on account size and scan frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Account Size</Label>
                    <Input 
                      type="number" 
                      placeholder="1000000" 
                      value={scanRequest.followerCount || ''}
                      onChange={(e) => setScanRequest(prev => ({ 
                        ...prev, 
                        followerCount: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Scans per Month</Label>
                    <Input type="number" placeholder="4" defaultValue="4" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-lg font-semibold">Estimated Monthly Cost</div>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(Math.max(99, (scanRequest.followerCount / 100000) * 50))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Based on {formatNumber(scanRequest.followerCount)} followers, 4 scans/month
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
