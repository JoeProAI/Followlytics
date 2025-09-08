'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Activity, Users, Clock, DollarSign, Server, AlertTriangle } from 'lucide-react'

interface SystemStatus {
  status: 'operational' | 'degraded' | 'down'
  activeJobs: number
  pendingJobs: number
  activeWorkers: number
  maxWorkers: number
  queueDepth: number
  utilizationRate: number
  usageStats?: {
    active_sandboxes: number
    total_cpu_hours: number
    total_memory_gb_hours: number
    current_hourly_cost: number
    credits_remaining: number
  }
}

interface Worker {
  id: string
  status: 'idle' | 'busy' | 'starting' | 'stopping'
  currentJob?: string
  jobsCompleted: number
  lastHeartbeat?: string
}

interface Job {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  workersAssigned: number
  estimatedCost: number
  actualCost: number
  errorMessage?: string
}

export default function EnterpriseMonitor() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch system status
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/enterprise/status')
      const data = await response.json()
      
      if (data.success) {
        setSystemStatus(data.system)
        setWorkers(data.workers || [])
      } else {
        setError('Failed to fetch system status')
      }
    } catch (err) {
      setError('System status unavailable')
    }
  }

  // Fetch recent jobs
  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/enterprise/jobs?limit=10')
      const data = await response.json()
      
      if (data.success) {
        setJobs(data.jobs || [])
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    }
  }

  // Fetch job details
  const fetchJobDetails = async (jobId: string) => {
    try {
      const response = await fetch(`/api/enterprise/scan?jobId=${jobId}`)
      const data = await response.json()
      
      if (data.success) {
        // Update job in list
        setJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, ...data.job } : job
        ))
      }
    } catch (err) {
      console.error('Failed to fetch job details:', err)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchSystemStatus(), fetchJobs()])
      setLoading(false)
    }

    fetchData()

    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchSystemStatus()
      fetchJobs()
      
      // Update selected job details
      if (selectedJob) {
        fetchJobDetails(selectedJob)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [selectedJob])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-500'
      case 'running': return 'bg-blue-500'
      case 'completed': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'pending': return 'bg-yellow-500'
      case 'busy': return 'bg-orange-500'
      case 'idle': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = end.getTime() - start.getTime()
    const minutes = Math.floor(duration / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Enterprise Monitor</h1>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus?.status || 'down')}`}></div>
          <span className="text-sm font-medium capitalize">
            {systemStatus?.status || 'Unknown'}
          </span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus?.activeJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {systemStatus?.pendingJobs || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStatus?.activeWorkers || 0}/{systemStatus?.maxWorkers || 50}
            </div>
            <Progress 
              value={(systemStatus?.utilizationRate || 0) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((systemStatus?.utilizationRate || 0) * 100)}% utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Depth</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus?.queueDepth || 0}</div>
            <p className="text-xs text-muted-foreground">
              jobs waiting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hourly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(systemStatus?.usageStats?.current_hourly_cost || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemStatus?.usageStats?.credits_remaining || 0} credits left
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workers Status */}
      <Card>
        <CardHeader>
          <CardTitle>Worker Fleet</CardTitle>
          <CardDescription>
            Real-time status of all worker sandboxes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? (
            <p className="text-muted-foreground">No active workers</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workers.map((worker) => (
                <div key={worker.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {worker.id.substring(0, 8)}...
                    </span>
                    <Badge className={getStatusColor(worker.status)}>
                      {worker.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Jobs completed: {worker.jobsCompleted}</div>
                    {worker.currentJob && (
                      <div>Current: {worker.currentJob.substring(0, 8)}...</div>
                    )}
                    {worker.lastHeartbeat && (
                      <div>
                        Last seen: {new Date(worker.lastHeartbeat).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>
            Latest enterprise scanning jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground">No recent jobs</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div 
                  key={job.id} 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedJob === job.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        Job {job.id.substring(0, 8)}...
                      </span>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(job.actualCost || job.estimatedCost)}
                    </div>
                  </div>
                  
                  {job.status === 'running' && (
                    <div className="mb-2">
                      <Progress value={job.progress * 100} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{Math.round(job.progress * 100)}% complete</span>
                        <span>{job.workersAssigned} workers</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(job.createdAt).toLocaleString()}
                    {job.startedAt && (
                      <span className="ml-4">
                        Duration: {formatDuration(job.startedAt, job.completedAt)}
                      </span>
                    )}
                  </div>
                  
                  {job.errorMessage && (
                    <div className="text-xs text-red-600 mt-2">
                      Error: {job.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
