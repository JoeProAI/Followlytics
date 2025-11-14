// Follower Extraction Service
// Handles follower data extraction and enrichment

import { ApifyClient } from 'apify-client'

export interface FollowerResult {
  username: string
  name: string
  bio?: string
  verified: boolean
  followersCount?: number
  followingCount?: number
  profileImageUrl?: string
  location?: string
}

export interface ExtractionResult {
  followers: FollowerResult[]
  totalExtracted: number
  success: boolean
  error?: string
}

export class FollowerExtractor {
  private client: ApifyClient
  
  constructor(apiToken?: string) {
    const token = apiToken || process.env.APIFY_API_TOKEN
    if (!token) {
      throw new Error('APIFY_API_TOKEN is required')
    }
    
    this.client = new ApifyClient({ token })
  }
  
  /**
   * Extract followers for a Twitter username using Apify
   * Uses professional infrastructure, no ToS violation from your side
   */
  async extractFollowers(
    username: string,
    options?: {
      maxFollowers?: number
      includeDetails?: boolean
    }
  ): Promise<ExtractionResult> {
    try {
      console.log(`[Extractor] Starting follower extraction for @${username}`)
      console.log(`[Extractor] Max followers: ${options?.maxFollowers || 1000}`)
      
      // Use Apify's Twitter Follower Scraper actor
      // Actor ID: curious_coder/twitter-scraper (correct actor name)
      const run = await this.client.actor('curious_coder/twitter-scraper').call({
        handles: [username],
        maxItems: options?.maxFollowers || 1000,
        
        // Get detailed profile information if requested
        includeUserInfo: options?.includeDetails !== false,
        
        // Proxy configuration (Apify handles this)
        proxyConfiguration: {
          useApifyProxy: true
        }
      })
      
      console.log(`[Apify] Actor run started: ${run.id}`)
      console.log(`[Apify] Status: ${run.status}`)
      
      // Get results from dataset
      const dataset = await this.client.dataset(run.defaultDatasetId).listItems()
      const followers = dataset.items as unknown as FollowerResult[]
      
      console.log(`[Apify] Extraction complete: ${followers.length} followers`)
      
      return {
        followers,
        totalExtracted: followers.length,
        success: true
      }
      
    } catch (error: any) {
      console.error('[Apify] Extraction failed:', error)
      
      return {
        followers: [],
        totalExtracted: 0,
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Extract profile information for a single user
   * Useful for getting follower count and basic info
   */
  async extractProfile(username: string): Promise<FollowerResult | null> {
    try {
      console.log(`[Apify] Extracting profile for @${username}`)
      
      // Use YOUR actual working actor: premium-x-follower-scraper
      // Just get 1 follower to extract the user profile data
      const run = await this.client.actor('kaitoeasyapi/premium-x-follower-scraper-following-data').call({
        user_names: [username], // NO @ symbol
        user_ids: [],
        maxFollowers: 1, // Just need profile, not followers
        maxFollowings: 0,
        getFollowers: false, // Don't need followers for profile check
        getFollowing: false
      })
      
      const dataset = await this.client.dataset(run.defaultDatasetId).listItems()
      
      console.log('[Apify] Dataset items:', dataset.items.length)
      
      if (dataset.items.length > 0) {
        const data = dataset.items[0] as any
        
        // The user profile is in the response
        console.log('[Apify] Profile data:', data)
        
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
      
      console.error('[Apify] No profile data returned')
      return null
      
    } catch (error: any) {
      console.error('[Apify] Profile extraction failed:', error)
      return null
    }
  }
  
  /**
   * Extract trending topics in an industry
   * Safe: public data, helps ALL users
   */
  async extractIndustryTrends(
    industry: string,
    options?: {
      maxTweets?: number
    }
  ): Promise<any[]> {
    try {
      console.log(`[Apify] Extracting trends for industry: ${industry}`)
      
      const run = await this.client.actor('quacker/twitter-search').call({
        searchTerms: [`#${industry}`, `${industry} trends`],
        maxItems: options?.maxTweets || 100,
        sort: 'Latest'
      })
      
      const dataset = await this.client.dataset(run.defaultDatasetId).listItems()
      
      console.log(`[Apify] Found ${dataset.items.length} trending posts`)
      return dataset.items
      
    } catch (error: any) {
      console.error('[Apify] Trend extraction failed:', error)
      return []
    }
  }
  
  /**
   * Get bot database - scrape known bot lists
   * Run monthly to update bot detection database
   */
  async updateBotDatabase(): Promise<string[]> {
    try {
      console.log('[Apify] Updating bot database from public lists...')
      
      const run = await this.client.actor('quacker/twitter-search').call({
        searchTerms: [
          'twitter bot list',
          'fake account database',
          'suspended accounts list'
        ],
        maxItems: 10000
      })
      
      const dataset = await this.client.dataset(run.defaultDatasetId).listItems()
      
      // Extract usernames from results
      const botUsernames = dataset.items
        .map((item: any) => item.username)
        .filter((username: string) => username)
      
      console.log(`[Apify] Bot database updated: ${botUsernames.length} accounts`)
      return botUsernames
      
    } catch (error: any) {
      console.error('[Apify] Bot database update failed:', error)
      return []
    }
  }
  
  /**
   * Check Apify account usage/credits
   */
  async getUsageStats(): Promise<{
    accountCredits: number
    usedThisMonth: number
  }> {
    try {
      const user = await this.client.user().get() as any
      
      return {
        accountCredits: user?.limits?.monthlyUsageCredits || 0,
        usedThisMonth: user?.usageCredits || 0
      }
      
    } catch (error) {
      console.error('[Apify] Failed to get usage stats:', error)
      return {
        accountCredits: 0,
        usedThisMonth: 0
      }
    }
  }
}

// Export singleton instance
let extractorInstance: FollowerExtractor | null = null

export function getExtractorClient(): FollowerExtractor {
  if (!extractorInstance) {
    extractorInstance = new FollowerExtractor()
  }
  return extractorInstance
}
