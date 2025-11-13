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
      console.log(`[DataProvider] Getting EXACT follower count for @${username}`)
      console.log(`[DataProvider] Using direct profile scrape - FREE and FAST!`)
      
      const cleanUsername = username.replace('@', '')
      
      // Method 1: Try scraping X.com profile page directly
      try {
        console.log(`[DataProvider] Scraping x.com/${cleanUsername}...`)
        
        const response = await fetch(`https://x.com/${cleanUsername}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://x.com/',
          }
        })
        
        if (response.ok) {
          const html = await response.text()
          
          // Look for follower count in HTML
          // X uses patterns like: "followers_count":1700 or <span>1.7K</span> Followers
          const patterns = [
            /"followers_count":(\d+)/i,
            /"profile".*?"followers_count":(\d+)/i,
            /(\d+(?:,\d+)*)\s*(?:<\/span>)?\s*Followers/i,
            /"legacy".*?"followers_count":(\d+)/i,
          ]
          
          for (const pattern of patterns) {
            const match = html.match(pattern)
            if (match && match[1]) {
              const count = parseInt(match[1].replace(/,/g, ''))
              if (!isNaN(count) && count >= 0) {
                console.log(`[DataProvider] ✅ @${username} has EXACTLY ${count} followers (from x.com scrape)`)
                
                return {
                  username: cleanUsername,
                  name: cleanUsername,
                  bio: `X user`,
                  verified: false,
                  followersCount: count,
                  followingCount: 0,
                  profileImageUrl: undefined,
                  location: ''
                }
              }
            }
          }
        }
      } catch (error) {
        console.log('[DataProvider] X.com scrape failed, trying Apify Web Scraper...')
      }
      
      // Method 2: Use Apify Web Scraper (free tier available)
      try {
        const { ApifyClient } = await import('apify-client')
        const client = new ApifyClient({ token: this.apiKey })
        
        console.log('[DataProvider] Using Apify Web Scraper...')
        
        const run = await client.actor('apify/web-scraper').call({
          startUrls: [{ url: `https://x.com/${cleanUsername}` }],
          linkSelector: 'none',
          pageFunction: `async function pageFunction(context) {
            const { page } = context;
            
            // Wait for page to load
            await page.waitForTimeout(3000);
            
            // Get the full HTML
            const html = await page.content();
            
            // Look for follower count
            const patterns = [
              /"followers_count":(\\d+)/i,
              /(\\d+(?:,\\d+)*)\\s*Followers/i,
            ];
            
            for (const pattern of patterns) {
              const match = html.match(pattern);
              if (match && match[1]) {
                const count = parseInt(match[1].replace(/,/g, ''));
                if (!isNaN(count)) {
                  return { followersCount: count };
                }
              }
            }
            
            return { followersCount: null };
          }`,
        })
        
        await client.run(run.id).waitForFinish()
        const dataset = await client.dataset(run.defaultDatasetId).listItems()
        
        const firstItem = dataset.items[0] as any
        if (dataset.items.length > 0 && firstItem?.followersCount) {
          const count = firstItem.followersCount as number
          console.log(`[DataProvider] ✅ @${username} has EXACTLY ${count} followers (from Apify Web Scraper)`)
          
          return {
            username: cleanUsername,
            name: cleanUsername,
            bio: `X user`,
            verified: false,
            followersCount: count,
            followingCount: 0,
            profileImageUrl: undefined,
            location: ''
          }
        }
      } catch (error) {
        console.log('[DataProvider] Apify Web Scraper failed:', error)
      }
      
      // All methods failed
      console.error('[DataProvider] ❌ All methods failed to get follower count')
      return null
      
    } catch (error: any) {
      console.error('[DataProvider] Profile fetch failed:', error)
      return null
    }
  }
  
  // OLD COMPLEX CODE - keeping for reference
  async getUserProfile_OLD(username: string): Promise<UserProfile | null> {
    try {
      console.log(`[DataProvider] Fetching profile for @${username} (OLD METHOD)`)
      
      const { ApifyClient } = await import('apify-client')
      const client = new ApifyClient({ token: this.apiKey })
      
      console.log(`[DataProvider] Using YOUR premium X scraper (kaitoeasyapi)...`)
      
      // Use YOUR premium actor - the one you're paying for!
      // Extract 200 followers to get access to run metadata
      const run = await client.actor('kaitoeasyapi/premium-x-follower-scraper-following-data').call({
        user_names: [username],
        user_ids: [],
        maxFollowers: 200, // Minimum required
        maxFollowings: 200, // Minimum required
        getFollowers: true,
        getFollowing: false
      })
      
      console.log('[DataProvider] Waiting for run to complete...')
      await client.run(run.id).waitForFinish()
      
      console.log('[DataProvider] Checking run statistics for target user info...')
      const runInfo = await client.run(run.id).get() as any
      
      // Log everything to find where target user info is stored
      console.log('[DataProvider] DEBUG - Run stats:', JSON.stringify(runInfo.stats, null, 2))
      console.log('[DataProvider] DEBUG - Run status message:', runInfo.statusMessage)
      console.log('[DataProvider] DEBUG - Run meta:', JSON.stringify(runInfo.meta, null, 2))
      
      // Check if run has custom data
      if (runInfo.meta && runInfo.meta.customData) {
        console.log('[DataProvider] DEBUG - Custom data:', JSON.stringify(runInfo.meta.customData, null, 2))
      }
      
      // Get first follower item to see target_username confirmation
      const dataset = await client.dataset(run.defaultDatasetId).listItems()
      if (dataset.items.length > 0) {
        const firstFollower = dataset.items[0] as any
        console.log('[DataProvider] Confirmed target username:', firstFollower.target_username)
        
        // HACK: The actor MUST have fetched the target user profile to extract followers
        // Let's check if ANY item in the dataset has the target user's full profile
        // Look for an item where screen_name === target_username
        const targetUserItem = dataset.items.find((item: any) => 
          item.screen_name === username || item.screen_name === username.replace('@', '')
        )
        
        if (targetUserItem) {
          const targetData = targetUserItem as any
          const followerCount = targetData.followers_count
          console.log(`[DataProvider] FOUND target user in dataset! @${username} has ${followerCount} followers`)
          
          return {
            username: targetData.screen_name || username,
            name: targetData.name || username,
            bio: targetData.description || `X user`,
            verified: targetData.verified || false,
            followersCount: followerCount,
            followingCount: targetData.friends_count || 0,
            profileImageUrl: targetData.profile_image_url_https || undefined,
            location: targetData.location || ''
          }
        }
      }
      
      // If we can't find target user profile, we need to make a direct API call
      console.log('[DataProvider] Target user profile not in dataset, using X API...')
      
      // Import X API client and get profile directly
      const { XApiClient } = await import('./x-api-client')
      const xClient = new XApiClient()
      const xProfile = await xClient.getUserProfile(username)
      
      if (xProfile && xProfile.success) {
        console.log(`[DataProvider] @${username} has EXACT ${xProfile.followerCount} followers (from X API)`)
        
        return {
          username: username,
          name: xProfile.name,
          bio: xProfile.bio,
          verified: xProfile.verified,
          followersCount: xProfile.followerCount,
          followingCount: 0,
          profileImageUrl: xProfile.profileImageUrl,
          location: xProfile.location
        }
      }
      
      // Last resort fallback - use extracted count as minimum estimate
      console.log('[DataProvider] WARNING: Using extracted count as minimum estimate')
      const followerCount = dataset.items.length
      
      // Return profile with estimated count
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
