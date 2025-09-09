// Shared in-memory storage for scan jobs across API routes
export const activeScanJobs = new Map<string, any>()

export interface ScanJob {
  sandbox_id: string
  username: string
  status: 'initializing' | 'running' | 'completed' | 'failed'
  progress: number
  startTime: number
  estimated_followers: number
  account_size: string
  estimated_duration: string
  estimated_cost: string
  phase: string
  followers_found: number
  real_data?: any[]
  ai_analysis?: any
  metrics?: any
  error?: string
}

export function getMostRecentCompletedScan(): { followers: any[], total: number } {
  let mostRecentFollowers: any[] = []
  let mostRecentTotal = 0
  let mostRecentScanTime = 0

  activeScanJobs.forEach((job) => {
    if (job.status === 'completed' && job.startTime > mostRecentScanTime) {
      mostRecentScanTime = job.startTime
      mostRecentFollowers = job.real_data || []
      mostRecentTotal = job.followers_found || 0
    }
  })

  return {
    followers: mostRecentFollowers,
    total: mostRecentTotal
  }
}
