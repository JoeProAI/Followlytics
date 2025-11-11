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
      
      const { ApifyClient } = await import('apify-client')
      const client = new ApifyClient({ token: this.apiKey })
      
      // Use curious_coder - fast profile scraper
      const run = await client.actor('curious_coder/twitter-scraper').call({
        handle: [username],
        maxTweets: 0
      })
      
      const dataset = await client.dataset(run.defaultDatasetId).listItems()
      
      if (dataset.items.length > 0) {
        const profile = dataset.items[0] as any
        
        console.log('[DataProvider] Profile:', profile.username, '-', profile.followers, 'followers')
        
        return {
          username: profile.username || username,
          name: profile.name || profile.username,
          bio: profile.bio || '',
          verified: profile.verified || false,
          followersCount: profile.followers || 0,
          followingCount: profile.following || 0,
          profileImageUrl: profile.avatar,
          location: profile.location || ''
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
