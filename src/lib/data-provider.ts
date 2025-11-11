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
      
      // Use YOUR premium actor - extract 1000 sample for eligibility check
      const run = await client.actor('kaitoeasyapi/premium-x-follower-scraper-following-data').call({
        user_names: [username],
        user_ids: [],
        maxFollowers: 1000, // Sample 1000 to verify and estimate count
        maxFollowings: 200,
        getFollowers: true,
        getFollowing: false
      })
      
      const dataset = await client.dataset(run.defaultDatasetId).listItems()
      
      if (dataset.items.length === 0) {
        return null
      }
      
      // Get target user info from first follower
      const firstFollower = dataset.items[0] as any
      const targetUsername = firstFollower.target_username
      
      // Count sample extracted
      const sampleCount = dataset.items.length
      
      // Estimate total based on whether we hit the limit
      // If we got 1000, user likely has WAY more
      const estimatedCount = sampleCount >= 1000 
        ? sampleCount * 10 // Conservative estimate
        : sampleCount
      
      console.log(`[DataProvider] Sampled ${sampleCount} followers for @${targetUsername} - estimated ${estimatedCount}`)
      
      // Return profile using target username and estimated count
      return {
        username: targetUsername || username,
        name: targetUsername,
        bio: `X user`,
        verified: false,
        followersCount: estimatedCount,
        followingCount: 0,
        profileImageUrl: undefined,
        location: ''
      }
      
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
      
      const targetMax = options?.maxFollowers || 10000000 // No limit by default
      const CHUNK_SIZE = 200000 // Actor can handle 200K per run safely
      
      // If target is small, do single run
      if (targetMax <= CHUNK_SIZE) {
        console.log(`[DataProvider] Single extraction for ${targetMax} followers`)
        return await this.extractSingleBatch(client, username, targetMax)
      }
      
      // Large account - use chunked extraction
      console.log(`[DataProvider] Chunked extraction for up to ${targetMax} followers`)
      return await this.extractChunked(client, username, targetMax, CHUNK_SIZE)
      
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
  
  private async extractSingleBatch(
    client: any,
    username: string,
    maxFollowers: number
  ): Promise<FollowerData> {
    const run = await client.actor('kaitoeasyapi/premium-x-follower-scraper-following-data').call({
      user_names: [username],
      user_ids: [],
      maxFollowers,
      maxFollowings: 200,
      getFollowers: true,
      getFollowing: false
    })
    
    const dataset = await client.dataset(run.defaultDatasetId).listItems()
    const followers: UserProfile[] = []
    
    for (const item of dataset.items) {
      const follower = item as any
      followers.push({
        username: follower.user_name || follower.username || follower.screen_name,
        name: follower.name || follower.user_name,
        bio: follower.description || follower.bio,
        verified: follower.verified || false,
        followersCount: follower.followers_count || 0,
        followingCount: follower.following_count || follower.friends_count || 0,
        profileImageUrl: follower.profile_image_url || follower.profile_image_url_https,
        location: follower.location
      })
    }
    
    return {
      followers,
      totalExtracted: followers.length,
      success: true
    }
  }
  
  private async extractChunked(
    client: any,
    username: string,
    targetMax: number,
    chunkSize: number
  ): Promise<FollowerData> {
    const allFollowers: UserProfile[] = []
    const seenUsernames = new Set<string>()
    let totalExtracted = 0
    
    // Calculate number of chunks needed
    const numChunks = Math.ceil(targetMax / chunkSize)
    
    console.log(`[DataProvider] Extracting ${numChunks} chunks of ${chunkSize} followers each`)
    
    for (let chunk = 0; chunk < numChunks; chunk++) {
      console.log(`[DataProvider] Chunk ${chunk + 1}/${numChunks}`)
      
      try {
        // Extract this chunk
        const batchResult = await this.extractSingleBatch(client, username, chunkSize)
        
        if (!batchResult.success) {
          console.error(`[DataProvider] Chunk ${chunk + 1} failed`)
          break
        }
        
        // Deduplicate and add to results
        for (const follower of batchResult.followers) {
          if (!seenUsernames.has(follower.username)) {
            seenUsernames.add(follower.username)
            allFollowers.push(follower)
            totalExtracted++
          }
        }
        
        console.log(`[DataProvider] Chunk ${chunk + 1} complete - ${totalExtracted} total followers`)
        
        // If we got less than chunk size, we've reached the end
        if (batchResult.followers.length < chunkSize) {
          console.log(`[DataProvider] Reached end of followers at ${totalExtracted}`)
          break
        }
        
        // If we've hit our target, stop
        if (totalExtracted >= targetMax) {
          console.log(`[DataProvider] Reached target of ${targetMax} followers`)
          break
        }
        
        // Small delay between chunks to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error: any) {
        console.error(`[DataProvider] Chunk ${chunk + 1} error:`, error)
        // Continue with what we have
        break
      }
    }
    
    return {
      followers: allFollowers,
      totalExtracted: totalExtracted,
      success: true
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
