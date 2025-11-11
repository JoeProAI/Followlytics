// Generic data provider - abstracts the data source
// Competitors can't see we're using Apify

export interface UserProfile {
  username: string
  name: string
  bio?: string
  verified: boolean
  followersCount?: number
  followingCount?: number
  profileImageUrl?: string
  location?: string
}

export interface FollowerData {
  followers: UserProfile[]
  totalExtracted: number
  success: boolean
  error?: string
}

class DataProvider {
  private apiKey: string
  
  constructor() {
    // Generic env var name
    this.apiKey = process.env.DATA_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('DATA_API_KEY is required')
    }
  }
  
  async getUserProfile(username: string): Promise<UserProfile | null> {
    try {
      console.log(`[DataProvider] Fetching profile for @${username}`)
      
      // Import Apify internally - not visible in imports
      const { ApifyClient } = await import('apify-client')
      const client = new ApifyClient({ token: this.apiKey })
      
      // Use apidojo/tweet-scraper for PROFILE ONLY (doesn't return followers)
      const run = await client.actor('apidojo/tweet-scraper').call({
        twitterHandles: [username],
        maxTweetsPerQuery: 0, // Don't need tweets, just profile
        proxyConfig: { useApifyProxy: true }
      })
      
      const dataset = await client.dataset(run.defaultDatasetId).listItems()
      
      console.log('[DataProvider] Dataset items:', dataset.items.length)
      
      if (dataset.items.length > 0) {
        const item = dataset.items[0] as any
        const user = item.user || item // Profile is in 'user' field
        
        console.log('[DataProvider] Found profile:', {
          username: user.screen_name || user.username,
          followers: user.followers_count || user.followersCount
        })
        
        return {
          username: user.screen_name || user.username || username,
          name: user.name || username,
          bio: user.description || user.bio || '',
          verified: user.verified || false,
          followersCount: user.followers_count || user.followersCount || 0,
          followingCount: user.friends_count || user.followingCount || 0,
          profileImageUrl: user.profile_image_url_https || user.profileImageUrl,
          location: user.location || ''
        }
      }
      
      console.error('[DataProvider] No profile data found in response')
      return null
      
    } catch (error: any) {
      console.error('[DataProvider] Profile fetch failed:', error)
      return null
    }
  }
  
  async getFollowers(
    username: string,
    options?: {
      maxFollowers?: number
      includeDetails?: boolean
    }
  ): Promise<FollowerData> {
    try {
      console.log(`[DataProvider] Extracting followers for @${username}`)
      
      const { ApifyClient } = await import('apify-client')
      const client = new ApifyClient({ token: this.apiKey })
      
      const run = await client.actor('kaitoeasyapi/premium-x-follower-scraper-following-data').call({
        user_names: [username],
        user_ids: [],
        maxFollowers: options?.maxFollowers || 1000,
        maxFollowings: 0,
        getFollowers: true,
        getFollowing: false
      })
      
      const dataset = await client.dataset(run.defaultDatasetId).listItems()
      const followers: UserProfile[] = []
      
      for (const item of dataset.items) {
        const follower = item as any
        followers.push({
          username: follower.user_name || follower.username,
          name: follower.name || follower.user_name,
          bio: follower.description || follower.bio,
          verified: follower.verified || false,
          followersCount: follower.followers_count || 0,
          followingCount: follower.following_count || 0,
          profileImageUrl: follower.profile_image_url,
          location: follower.location
        })
      }
      
      return {
        followers,
        totalExtracted: followers.length,
        success: true
      }
      
    } catch (error: any) {
      console.error('[DataProvider] Extraction failed:', error)
      
      return {
        followers: [],
        totalExtracted: 0,
        success: false,
        error: error.message
      }
    }
  }
}

// Singleton instance
let providerInstance: DataProvider | null = null

export function getDataProvider(): DataProvider {
  if (!providerInstance) {
    providerInstance = new DataProvider()
  }
  return providerInstance
}
