'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Bot, Play, Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface OctoparseTask {
  task_id: string
  status: 'running' | 'completed' | 'failed' | 'paused'
  progress: number
  followers_found: number
  username: string
}

export default function OctoparseIntegration() {
  const [apiKey, setApiKey] = useState('')
  const [taskId, setTaskId] = useState('')
  const [username, setUsername] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [activeTask, setActiveTask] = useState<OctoparseTask | null>(null)
  const [result, setResult] = useState<any>(null)

  const startScraping = async () => {
    if (!apiKey || !taskId || !username) return

    setIsStarting(true)
    setResult(null)

    try {
      const response = await fetch('/api/octoparse/followers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.replace('@', ''),
          octoparse_api_key: apiKey,
          task_id: taskId
        })
      })

      const data = await response.json()

      if (data.success) {
        setActiveTask({
          task_id: data.task_id,
          status: 'running',
          progress: 0,
          followers_found: 0,
          username: username.replace('@', '')
        })
        
        // Start polling for status
        pollTaskStatus(data.task_id)
      } else {
        setResult({ success: false, error: data.error })
      }
    } catch (error) {
      setResult({ 
        success: false, 
        error: 'Failed to start scraping',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsStarting(false)
    }
  }

  const pollTaskStatus = async (taskId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/octoparse/followers?task_id=${taskId}&api_key=${apiKey}`)
        const status = await response.json()

        setActiveTask(prev => prev ? { ...prev, ...status } : null)

        if (status.status === 'completed') {
          // Auto-download results
          downloadResults(taskId)
        } else if (status.status === 'running') {
          // Continue polling
          setTimeout(checkStatus, 10000) // Check every 10 seconds
        } else if (status.status === 'failed') {
          setResult({
            success: false,
            error: 'Scraping failed',
            details: 'Twitter likely blocked the scraping attempt'
          })
        }
      } catch (error) {
        console.error('Status check error:', error)
      }
    }

    checkStatus()
  }

  const downloadResults = async (taskId: string) => {
    try {
      const response = await fetch(`/api/octoparse/download?task_id=${taskId}&api_key=${apiKey}&user_id=current_user`)
      const data = await response.json()

      setResult(data)
      setActiveTask(null)
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to download results',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Bot className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Octoparse Integration
        </CardTitle>
        <CardDescription>
          Use Octoparse to scrape Twitter followers with advanced anti-detection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Setup Instructions */}
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-2">How Octoparse Works:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
            <li><strong>No login required</strong> - Scrapes public Twitter pages only</li>
            <li><strong>Public accounts only</strong> - Cannot access private/protected followers</li>
            <li><strong>Limited data</strong> - Only what's visible on public follower pages</li>
            <li><strong>Anti-detection</strong> - Uses IP rotation and CAPTCHA solving</li>
          </ul>
        </div>

        {/* Setup Steps */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Setup Steps:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Create a Twitter follower scraping task in Octoparse</li>
            <li>Configure anti-detection: IP rotation, CAPTCHA solving, delays</li>
            <li>Get your API key from Octoparse dashboard</li>
            <li>Copy your task ID from the task settings</li>
          </ol>
        </div>

        {/* Configuration Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="api-key">Octoparse API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Your Octoparse API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="task-id">Task ID</Label>
            <Input
              id="task-id"
              placeholder="Your Twitter follower scraping task ID"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="username">Twitter Username</Label>
            <Input
              id="username"
              placeholder="@username or username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <Button 
            onClick={startScraping}
            disabled={!apiKey || !taskId || !username || isStarting}
            className="w-full"
          >
            <Play className="mr-2 h-4 w-4" />
            {isStarting ? 'Starting Scraper...' : 'Start Follower Scraping'}
          </Button>
        </div>

        {/* Active Task Status */}
        {activeTask && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(activeTask.status)}
                    <span className="font-medium">
                      Scraping @{activeTask.username}
                    </span>
                  </div>
                  <Badge variant={activeTask.status === 'running' ? 'default' : 'secondary'}>
                    {activeTask.status}
                  </Badge>
                </div>

                {activeTask.status === 'running' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{activeTask.followers_found} followers found</span>
                    </div>
                    <Progress value={activeTask.progress} className="w-full" />
                  </div>
                )}

                <p className="text-sm text-blue-700">
                  {activeTask.status === 'running' 
                    ? 'Scraping in progress... This may take 10-30 minutes.'
                    : 'Task completed. Processing results...'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <Card className={`border ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.success ? 'Scraping Completed!' : 'Scraping Failed'}
                </span>
              </div>

              {result.success && (
                <div className="space-y-2 text-green-800">
                  <p>Successfully scraped {result.followers_imported?.toLocaleString()} followers</p>
                  {result.data_quality && (
                    <div className="text-sm">
                      <p>Data Quality Score: {result.data_quality.quality_score}%</p>
                      <p>Complete profiles: {result.data_quality.data_completeness.display_names}</p>
                    </div>
                  )}
                </div>
              )}

              {result.error && (
                <div className="text-red-800">
                  <p className="font-medium">{result.error}</p>
                  {result.details && <p className="text-sm mt-1">{result.details}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Important Limitations */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="font-semibold text-red-900 mb-2">Important Limitations:</h3>
          <ul className="text-sm text-red-800 space-y-1">
            <li>• <strong>Public accounts only</strong> - Cannot scrape private/protected accounts</li>
            <li>• <strong>Incomplete data</strong> - Twitter only shows ~200-500 followers initially</li>
            <li>• <strong>Rate limiting</strong> - Twitter blocks excessive requests</li>
            <li>• <strong>TOS violation</strong> - Against Twitter's Terms of Service</li>
            <li>• <strong>No authentication</strong> - Cannot access user's private follower lists</li>
          </ul>
        </div>

        {/* Cost Considerations */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Cost Considerations:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Residential Proxies:</strong> $3/GB (required for reliability)</li>
            <li>• <strong>CAPTCHA Solving:</strong> $1-1.5/1000 CAPTCHAs</li>
            <li>• <strong>Plan Cost:</strong> $69-249/month for cloud processing</li>
            <li>• <strong>Success Rate:</strong> 30-60% due to Twitter's anti-bot measures</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
