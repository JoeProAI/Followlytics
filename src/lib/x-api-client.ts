/**
 * Simple X API v2 Client
 * Get follower count directly from X API - FAST & RELIABLE!
 */

const BEARER_TOKEN = process.env.X_BEARER_TOKEN
const API_KEY = process.env.X_API_KEY
const API_SECRET = process.env.X_API_SECRET
const ACCESS_TOKEN = process.env.X_ACCESS_TOKEN
const ACCESS_SECRET = process.env.X_ACCESS_TOKEN_SECRET

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
    let token = bearerToken || BEARER_TOKEN || ''
    
    // Decode URL-encoded tokens (common mistake)
    if (token.includes('%')) {
      console.log('[X API] Decoding URL-encoded Bearer token')
      token = decodeURIComponent(token)
    }
    
    // Log token info for debugging (first 10 chars only)
    console.log('[X API] Using Bearer token:', token?.substring(0, 10) + '...')
    
    this.bearerToken = token
  }

  /**
   * Get Bearer token using OAuth 2.0 Client Credentials
   * Fallback if X_BEARER_TOKEN is not set but X_API_KEY and X_API_SECRET are
   */
  private async getAppOnlyToken(): Promise<string> {
    if (!API_KEY || !API_SECRET) {
      throw new Error('X_BEARER_TOKEN or (X_API_KEY + X_API_SECRET) required')
    }

    console.log('[X API] Generating OAuth 2.0 Bearer token...')
    console.log('[X API] Using X_API_KEY:', API_KEY?.substring(0, 5) + '...')
    
    const credentials = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')
    
    const response = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[X API] OAuth token generation failed:', response.status, errorText)
      throw new Error(`Failed to get Bearer token: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[X API] ✅ Fresh Bearer token generated successfully')
    return data.access_token
  }

  /**
   * Ensure we have a valid Bearer token
   */
  private async ensureToken(): Promise<void> {
    if (!this.bearerToken) {
      this.bearerToken = await this.getAppOnlyToken()
    }
  }

  /**
   * Try X API v1.1 with OAuth 1.0a (might work on free tier!)
   * GET /1.1/users/show.json
   */
  private async getUserProfileV1(username: string): Promise<{
    success: boolean
    followerCount: number
    name: string
    verified: boolean
    bio: string
    location: string
    profileImageUrl: string
    error?: string
  }> {
    if (!ACCESS_TOKEN || !ACCESS_SECRET || !API_KEY || !API_SECRET) {
      throw new Error('OAuth 1.0a credentials required')
    }

    try {
      console.log('[X API] Trying v1.1 API with OAuth 1.0a...')
      
      const crypto = await import('crypto')
      const cleanUsername = username.replace('@', '')
      const url = `https://api.twitter.com/1.1/users/show.json?screen_name=${cleanUsername}`
      
      // OAuth 1.0a signature
      const oauth = {
        oauth_consumer_key: API_KEY,
        oauth_token: ACCESS_TOKEN,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_nonce: crypto.randomBytes(16).toString('hex'),
        oauth_version: '1.0'
      }
      
      // Create signature base string
      const params = {
        ...oauth,
        screen_name: cleanUsername
      }
      const sortedParams = Object.keys(params).sort().map(key => 
        `${key}=${encodeURIComponent((params as any)[key])}`
      ).join('&')
      const signatureBase = `GET&${encodeURIComponent('https://api.twitter.com/1.1/users/show.json')}&${encodeURIComponent(sortedParams)}`
      
      // Create signing key
      const signingKey = `${encodeURIComponent(API_SECRET)}&${encodeURIComponent(ACCESS_SECRET)}`
      
      // Generate signature
      const signature = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64')
      
      // Build Authorization header
      const authHeader = `OAuth ${Object.entries({...oauth, oauth_signature: signature})
        .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
        .join(', ')}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': authHeader
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('[X API] ✅ v1.1 API works! Follower count:', data.followers_count)
        
        return {
          success: true,
          followerCount: data.followers_count,
          name: data.name,
          verified: data.verified || false,
          bio: data.description || '',
          location: data.location || '',
          profileImageUrl: data.profile_image_url_https || ''
        }
      } else {
        const error = await response.text()
        console.log('[X API] v1.1 failed:', response.status, error)
        throw new Error(`v1.1 API failed: ${response.status}`)
      }
    } catch (error: any) {
      console.error('[X API] v1.1 error:', error)
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

  /**
   * Get user profile with EXACT follower count
   * Tries v1.1 first (OAuth 1.0a), then v2 (Bearer token)
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
      // Ensure we have a Bearer token (get one if needed)
      await this.ensureToken()
      
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
        
        // If 401 and we have API credentials, try getting a fresh token
        if (response.status === 401 && API_KEY && API_SECRET) {
          console.log('[X API] 401 Unauthorized - Generating fresh Bearer token from API credentials...')
          try {
            this.bearerToken = await this.getAppOnlyToken()
            console.log('[X API] Fresh token generated, retrying request...')
            
            // Retry with fresh token
            const retryResponse = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${this.bearerToken}`
              }
            })
            
            if (retryResponse.ok) {
              const retryData: XApiResponse = await retryResponse.json()
              const followerCount = retryData.data.public_metrics.followers_count
              console.log(`[X API] ✅ @${cleanUsername} has EXACTLY ${followerCount} followers (with fresh token)`)
              
              return {
                success: true,
                followerCount: followerCount,
                name: retryData.data.name,
                verified: retryData.data.verified || false,
                bio: retryData.data.description || '',
                location: retryData.data.location || '',
                profileImageUrl: retryData.data.profile_image_url || ''
              }
            }
          } catch (retryError: any) {
            console.error('[X API] Fresh token attempt also failed:', retryError)
          }
        }
        
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
