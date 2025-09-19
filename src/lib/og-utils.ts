/**
 * Utility functions for generating Open Graph (OG) image URLs
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://followlytics-zeta.vercel.app'

export interface ScanResultOGParams {
  username: string
  followers: number
  date?: string
  status?: 'completed' | 'failed' | 'scanning'
}

export interface ScanProgressOGParams {
  username: string
  progress: number
  current?: number
  phase?: 'creating_sandbox' | 'installing_dependencies' | 'installing_browser' | 'scanning_followers' | 'awaiting_signin'
}

/**
 * Generate OG image URL for scan results
 */
export function generateScanResultOG(params: ScanResultOGParams): string {
  const searchParams = new URLSearchParams({
    username: params.username,
    followers: params.followers.toString(),
    date: params.date || new Date().toLocaleDateString(),
    status: params.status || 'completed'
  })
  
  return `${BASE_URL}/api/og/scan-result?${searchParams.toString()}`
}

/**
 * Generate OG image URL for scan progress
 */
export function generateScanProgressOG(params: ScanProgressOGParams): string {
  const searchParams = new URLSearchParams({
    username: params.username,
    progress: params.progress.toString(),
    phase: params.phase || 'scanning'
  })
  
  if (params.current) {
    searchParams.set('current', params.current.toString())
  }
  
  return `${BASE_URL}/api/og/scan-progress?${searchParams.toString()}`
}

/**
 * Copy OG image URL to clipboard with social media message
 */
export async function shareToSocialMedia(ogImageUrl: string, message: string): Promise<void> {
  try {
    // Create shareable content
    const shareContent = `${message}\n\n🔗 ${ogImageUrl}`
    
    if (navigator.share) {
      // Use native sharing if available
      await navigator.share({
        title: 'Followlytics Scan Results',
        text: message,
        url: ogImageUrl
      })
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareContent)
      alert('📋 Share content copied to clipboard!\n\nPaste this into your social media post.')
    }
  } catch (error) {
    console.error('Failed to share:', error)
    // Final fallback: show the content to copy manually
    prompt('Copy this content to share:', `${message}\n\n🔗 ${ogImageUrl}`)
  }
}

/**
 * Generate social media message for scan results
 */
export function generateScanResultMessage(username: string, followerCount: number): string {
  const formattedCount = followerCount.toLocaleString()
  
  return `🎯 Just analyzed @${username}'s ${formattedCount} followers with Followlytics! 
  
📊 Get deep insights into your Twitter audience
🚀 Powered by advanced follower analytics
  
#TwitterAnalytics #FollowerInsights #SocialMediaGrowth`
}

/**
 * Generate social media message for live scan progress
 */
export function generateScanProgressMessage(username: string, progress: number): string {
  return `🔴 LIVE: Scanning @${username}'s followers... ${progress}% complete!
  
⚡ Real-time follower extraction in progress
📈 Watch the magic happen with Followlytics
  
#LiveScan #TwitterAnalytics #FollowerGrowth`
}
