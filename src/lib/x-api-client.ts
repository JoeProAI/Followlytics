/**
 * Simple X API v2 Client
 * Get follower count directly from X API - FAST & RELIABLE!
 */

const BEARER_TOKEN = process.env.X_BEARER_TOKEN

interface XUserData {
  id: string
  name: string
  username: string
  public_metrics: {
    followers_count: number
    following_count: number
    tweet_count: number
    listed_count: number
  }
  verified?: boolean
  description?: string
  profile_image_url?: string
  location?: string
}

interface XApiResponse {
  data: XUserData
}

export class XApiClient {
  private bearerToken: string

  constructor(bearerToken?: string) {
    this.bearerToken = bearerToken || BEARER_TOKEN || ''
    
    if (!this.bearerToken) {
      throw new Error('X_BEARER_TOKEN is required')
    }
  }

  /**
   * Get user profile with EXACT follower count
   * Uses X API v2: GET /2/users/by/username/:username
   */
  async getUserProfile(username: string): Promise<{
    success: boolean
    followerCount: number
    name: string
    verified: boolean
    bio: string
    location: string
    profileImageUrl: string
    error?: string
  }> {
    try {
      const cleanUsername = username.replace('@', '')
      
      console.log(`[X API] Fetching profile for @${cleanUsername}`)
      
      const url = `https://api.twitter.com/2/users/by/username/${cleanUsername}?user.fields=public_metrics,verified,description,profile_image_url,location`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`
        }
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`[X API] Error: ${response.status} - ${error}`)
        
        if (response.status === 404) {
          return {
            success: false,
            error: 'Account not found',
            followerCount: 0,
            name: '',
            verified: false,
            bio: '',
            location: '',
            profileImageUrl: ''
          }
        }
        
        throw new Error(`X API error: ${response.status}`)
      }

      const data: XApiResponse = await response.json()
      
      const followerCount = data.data.public_metrics.followers_count
      
      console.log(`[X API] ✅ @${cleanUsername} has EXACTLY ${followerCount} followers`)
      
      return {
        success: true,
        followerCount: followerCount,
        name: data.data.name,
        verified: data.data.verified || false,
        bio: data.data.description || '',
        location: data.data.location || '',
        profileImageUrl: data.data.profile_image_url || ''
      }
      
    } catch (error: any) {
      console.error(`[X API] Failed to fetch profile:`, error)
      return {
        success: false,
        error: error.message,
        followerCount: 0,
        name: '',
        verified: false,
        bio: '',
        location: '',
        profileImageUrl: ''
      }
    }
  }
}

// Export singleton instance
export const xApiClient = new XApiClient()
