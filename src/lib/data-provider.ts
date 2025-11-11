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
      
      const run = await client.actor('kaitoeasyapi/premium-x-follower-scraper-following-data').call({
        user_names: [username],
        user_ids: [],
        maxFollowers: 1,
        maxFollowings: 0,
        getFollowers: false,
        getFollowing: false
      })
      
      const dataset = await client.dataset(run.defaultDatasetId).listItems()
      
      if (dataset.items.length > 0) {
        const data = dataset.items[0] as any
        
        return {
          username: data.user_name || data.username || username,
          name: data.name || data.user_name || username,
          bio: data.description || data.bio || '',
          verified: data.verified || data.is_verified || false,
          followersCount: data.followers_count || data.followersCount || 0,
          followingCount: data.following_count || data.followingCount || 0,
          profileImageUrl: data.profile_image_url || data.avatar_url,
          location: data.location || ''
        }
      }
      
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
