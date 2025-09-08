'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Zap, DollarSign, Users, Activity, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface DaytonaScanProgressProps {
  scanProgress: {
    job_id: string
    username: string
    status: string
    account_size: string
    estimated_duration: number
    estimated_cost: number
    progress: number
    results?: {
      followers?: any[]
      total_followers?: number
      processing_time_minutes?: number
    }
  }
  onComplete?: (followers: any[]) => void
}

export default function DaytonaScanProgress({ scanProgress, onComplete }: DaytonaScanProgressProps) {
  const [currentProgress, setCurrentProgress] = useState(scanProgress.progress || 0)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setCurrentProgress(scanProgress.progress || 0)
    
    if (scanProgress.status === 'completed' && scanProgress.results?.followers && onComplete) {
      onComplete(scanProgress.results.followers)
    }
  }, [scanProgress, onComplete])

  const getStatusIcon = () => {
    switch (scanProgress.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusColor = () => {
    switch (scanProgress.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getAccountSizeInfo = () => {
    const sizeInfo = {
      micro: { label: 'Micro', color: 'bg-green-100 text-green-800', icon: '⚡' },
      small: { label: 'Small', color: 'bg-blue-100 text-blue-800', icon: '🚀' },
      medium: { label: 'Medium', color: 'bg-purple-100 text-purple-800', icon: '💫' },
      large: { label: 'Large', color: 'bg-orange-100 text-orange-800', icon: '🔥' },
      mega: { label: 'Mega', color: 'bg-red-100 text-red-800', icon: '⚡' }
    }
    
    return sizeInfo[scanProgress.account_size as keyof typeof sizeInfo] || sizeInfo.small
  }

  const accountInfo = getAccountSizeInfo()

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">
                Daytona Scan: @{scanProgress.username}
              </CardTitle>
              <CardDescription>
                Job ID: {scanProgress.job_id}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={accountInfo.color}>
              {accountInfo.icon} {accountInfo.label}
            </Badge>
            <Badge className={getStatusColor()}>
              {scanProgress.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(currentProgress)}%</span>
          </div>
          <Progress value={currentProgress} className="h-3" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-xs text-gray-500">Elapsed</div>
              <div className="font-medium">{formatTime(elapsedTime)}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Zap className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-xs text-gray-500">Est. Duration</div>
              <div className="font-medium">{scanProgress.estimated_duration}m</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <DollarSign className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-xs text-gray-500">Est. Cost</div>
              <div className="font-medium">${scanProgress.estimated_cost?.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Users className="h-4 w-4 text-purple-500" />
            <div>
              <div className="text-xs text-gray-500">Followers</div>
              <div className="font-medium">
                {scanProgress.results?.total_followers?.toLocaleString() || '...'}
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-2">
          {scanProgress.status === 'queued' && (
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
              <Activity className="h-4 w-4" />
              <span>Job queued - waiting for optimized Daytona worker...</span>
            </div>
          )}
          
          {scanProgress.status === 'running' && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Scanning followers with optimized {accountInfo.label.toLowerCase()} worker...</span>
            </div>
          )}
          
          {scanProgress.status === 'completed' && scanProgress.results && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span>
                Scan completed! Found {scanProgress.results.total_followers?.toLocaleString()} followers 
                in {scanProgress.results.processing_time_minutes?.toFixed(1)} minutes
              </span>
            </div>
          )}
          
          {scanProgress.status === 'failed' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <XCircle className="h-4 w-4" />
              <span>Scan failed - please try again or contact support</span>
            </div>
          )}
        </div>

        {/* Performance Info */}
        {scanProgress.status === 'completed' && scanProgress.results && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-900 mb-2">Performance Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Processing Rate:</span>
                <span className="font-medium ml-2">
                  {Math.round((scanProgress.results.total_followers || 0) / (scanProgress.results.processing_time_minutes || 1))} followers/min
                </span>
              </div>
              <div>
                <span className="text-gray-500">Cost per Follower:</span>
                <span className="font-medium ml-2">
                  ${((scanProgress.estimated_cost || 0) / (scanProgress.results.total_followers || 1)).toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {scanProgress.status === 'failed' && (
          <div className="flex justify-center">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Scan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
