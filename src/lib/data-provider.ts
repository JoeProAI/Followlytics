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
      
      console.log(`[DataProvider] Using premium X scraper to get profile metadata...`)
      console.log(`[DataProvider] Extracting 200 followers to get target user info...`)
      
      // Use YOUR premium actor - extract minimal followers to get target user metadata
      const run = await client.actor('kaitoeasyapi/premium-x-follower-scraper-following-data').call({
        user_names: [username],
        user_ids: [],
        maxFollowers: 200, // Minimum required by actor (validated)
        maxFollowings: 200, // Also needs to be >= 200!
        getFollowers: true,
        getFollowing: false
      })
      
      // Get the run metadata which contains target user profile info
      console.log('[DataProvider] Fetching run metadata for target user profile...')
      const runInfo = await client.run(run.id).get() as any
      
      console.log('[DataProvider] DEBUG - Run info fields:', Object.keys(runInfo || {}))
      console.log('[DataProvider] DEBUG - Run output fields:', Object.keys(runInfo?.output || {}))
      console.log('[DataProvider] DEBUG - Run output:', JSON.stringify(runInfo?.output, null, 2))
      console.log('[DataProvider] DEBUG - Run stats:', JSON.stringify(runInfo?.stats, null, 2))
      
      // The run metadata should contain target user info
      const targetUserInfo = runInfo?.output?.targetUserInfo || runInfo?.output?.targetUser || runInfo?.output?.userProfile
      
      if (targetUserInfo) {
        console.log('[DataProvider] DEBUG - Target user info:', JSON.stringify(targetUserInfo, null, 2))
        const followerCount = targetUserInfo.followers_count || targetUserInfo.followersCount
        
        if (followerCount || followerCount === 0) {
          console.log(`[DataProvider] @${username} has EXACT ${followerCount} followers (from run metadata)`)
          
          return {
            username: username,
            name: targetUserInfo.name || username,
            bio: targetUserInfo.description || `X user`,
            verified: targetUserInfo.verified || false,
            followersCount: followerCount,
            followingCount: targetUserInfo.friends_count || 0,
            profileImageUrl: targetUserInfo.profile_image_url_https || undefined,
            location: targetUserInfo.location || ''
          }
        }
      }
      
      // Fallback: count the dataset items (but this is NOT accurate!)
      console.log('[DataProvider] WARNING: Could not find target user info in run metadata')
      console.log('[DataProvider] Counting extracted followers as estimate...')
      const dataset = await client.dataset(run.defaultDatasetId).listItems()
      const extractedCount = dataset.items.length
      
      console.log(`[DataProvider] ESTIMATE: @${username} has AT LEAST ${extractedCount} followers (extracted count)`)
      
      const followerCount = extractedCount
      
      // Return profile with follower count
      return {
        username: username,
        name: username,
        bio: `X user`,
        verified: false,
        followersCount: followerCount,
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
