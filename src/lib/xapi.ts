// COMPREHENSIVE X API v2 Integration - Maximize $200/month API Value
import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2'

interface XUserMetrics {
  public_metrics: {
    followers_count: number
    following_count: number
    tweet_count: number
    listed_count: number
  }
}

// Use Twitter API types directly to avoid conflicts
type XTweet = TweetV2
type XUser = UserV2

interface XAnalyticsData {
  user_metrics: any
  recent_tweets: any[]
  engagement_rate: number
  top_performing_tweet: any | null
  most_recent_tweet?: any | null
  account_strategy?: any | null  // NEW: Overall strategic recommendations
  total_impressions: number
  total_engagements: number
  growth_metrics: {
    followers_growth: number
    engagement_growth: number
  }
  sentiment_analysis: {
    positive: number
    negative: number
    neutral: number
  }
}

class XAPIService {
  private client: TwitterApi
  private bearerToken: string

  constructor() {
    this.bearerToken = process.env.X_BEARER_TOKEN || ''
    if (!this.bearerToken) {
      throw new Error('X_BEARER_TOKEN is required')
    }
    this.client = new TwitterApi(this.bearerToken)
  }

  // Get user by username
  async getUserByUsername(username: string): Promise<any> {
    try {
      const user = await this.client.v2.userByUsername(username, {
        'user.fields': [
          'public_metrics',
          'created_at',
          'description',
          'location',
          'verified',
          'verified_type'
        ]
      })
      return user.data
    } catch (error) {
      console.error('Error fetching user:', error)
      throw new Error('Failed to fetch user data from X API')
    }
  }

  // Get user's recent tweets with metrics
  async getUserTweets(userId: string, maxResults: number = 10): Promise<any[]> {
    try {
      const tweets = await this.client.v2.userTimeline(userId, {
        max_results: maxResults,
        'tweet.fields': [
          'public_metrics',
          'created_at',
          'context_annotations',
          'lang',
          'possibly_sensitive'
        ],
        exclude: ['retweets', 'replies'] // Focus on original content
      })

      return tweets.data?.data || []
    } catch (error) {
      console.error('Error fetching tweets:', error)
      throw new Error('Failed to fetch tweets from X API')
    }
  }

  // Calculate post reach using 1% virality model
  calculatePostReach(post: any, followerCount: number): number {
    if (!followerCount) return 0
    
    const metrics = post.public_metrics
    if (!metrics) return Math.round(followerCount * 0.01) // Base 1% reach
    
    // Calculate engagement score to determine virality
    const totalEngagements = metrics.like_count + metrics.repost_count + metrics.reply_count + metrics.quote_count
    const engagementRate = followerCount > 0 ? totalEngagements / followerCount : 0
    
    // Virality scale: starts at 1%, can scale up based on performance
    let reachMultiplier = 0.01 // Base 1% of followers see it
    
    if (engagementRate > 0.001) reachMultiplier = 0.015 // 1.5% if showing traction
    if (engagementRate > 0.005) reachMultiplier = 0.03  // 3% if good engagement
    if (engagementRate > 0.01) reachMultiplier = 0.05   // 5% if strong performance
    if (engagementRate > 0.02) reachMultiplier = 0.10   // 10% if viral momentum
    if (engagementRate > 0.05) reachMultiplier = 0.20   // 20% if highly viral
    if (engagementRate > 0.10) reachMultiplier = 0.50   // 50% if explosive viral
    
    return Math.round(followerCount * reachMultiplier)
  }

  // Calculate engagement rate based on actual reach
  calculateEngagementRate(posts: any[], followerCount: number): number {
    if (!posts.length || !followerCount) return 0

    const totalEngagements = posts.reduce((sum, post) => {
      const metrics = post.public_metrics
      if (!metrics) return sum
      return sum + (metrics.like_count + metrics.repost_count + metrics.reply_count + metrics.quote_count)
    }, 0)

    // Calculate total reach across all posts using 1% virality model
    const totalReach = posts.reduce((sum, post) => {
      return sum + this.calculatePostReach(post, followerCount)
    }, 0)
    
    return totalReach > 0 ? (totalEngagements / totalReach) * 100 : 0
  }

  // Find top performing post (highest engagement score)
  findTopPerformingPost(posts: any[]): any | null {
    if (!posts.length) return null

    let topPost = null
    let topScore = -1

    for (const post of posts) {
      if (!post.public_metrics) continue
      
      // Calculate engagement score (weighted: retweets worth 2x, replies 1.5x)
      const score = post.public_metrics.like_count + 
                    post.public_metrics.repost_count * 2 + 
                    post.public_metrics.reply_count * 1.5
      
      if (score > topScore) {
        topScore = score
        topPost = post
      }
    }

    // Debug logging
    if (topPost) {
      console.log(`[Top Post] Selected post with score ${topScore}:`, {
        likes: topPost.public_metrics.like_count,
        retweets: topPost.public_metrics.repost_count,
        replies: topPost.public_metrics.reply_count,
        text_preview: topPost.text.substring(0, 50) + '...'
      })
    }

    return topPost
  }

  // Analyze overall account strategy using Grok AI
  async analyzeAccountStrategy(posts: any[], username: string, followerCount: number): Promise<any> {
    if (!posts.length) return null

    try {
      const GrokAPI = (await import('./grokAPI')).default
      const grok = new GrokAPI()

      // Get top 5 posts by engagement
      const topPosts = [...posts]
        .filter(p => p.public_metrics)
        .sort((a, b) => {
          const scoreA = a.public_metrics.like_count + a.public_metrics.repost_count * 2 + a.public_metrics.reply_count * 1.5
          const scoreB = b.public_metrics.like_count + b.public_metrics.repost_count * 2 + b.public_metrics.reply_count * 1.5
          return scoreB - scoreA
        })
        .slice(0, 5)

      const postsText = topPosts.map((p, i) => 
        `${i + 1}. "${p.text}" (${p.public_metrics.like_count} likes, ${p.public_metrics.repost_count} RTs)`
      ).join('\n')

      const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || ''
      if (!apiKey) return null

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-2-latest',
          messages: [
            {
              role: 'system',
              content: `You are Grok, an expert X/Twitter strategist. Analyze @${username}'s content and provide actionable recommendations to improve engagement and grow followers.`
            },
            {
              role: 'user',
              content: `Analyze @${username}'s top performing posts:

${postsText}

Account stats:
- Followers: ${followerCount.toLocaleString()}
- Posts analyzed: ${posts.length}

Provide strategic recommendations in JSON format (no markdown):
{
  "content_patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "what_works": "2-sentence summary of what's working",
  "what_to_improve": "2-sentence summary of improvement areas",
  "action_plan": [
    {"action": "specific thing to do", "why": "why it will help"},
    {"action": "specific thing to do", "why": "why it will help"},
    {"action": "specific thing to do", "why": "why it will help"}
  ],
  "next_post_idea": "specific tweet suggestion based on what works"
}`
            }
          ],
          temperature: 0.7,
          max_tokens: 600
        })
      })

      if (!response.ok) {
        console.error('Grok strategy analysis failed:', response.statusText)
        return null
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) return null

      // Parse JSON
      try {
        return JSON.parse(content)
      } catch {
        const jsonMatch = content.match(/\{[\s\S]+\}/)
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null
      }

    } catch (error) {
      console.error('Error analyzing account strategy:', error)
      return null
    }
  }

  // Analyze why a post performed well using Grok AI
  async analyzeTopPost(post: any, followerCount: number): Promise<any> {
    if (!post) return null

    const metrics = post.public_metrics
    const engagementRate = followerCount > 0 
      ? ((metrics.like_count + metrics.repost_count + metrics.reply_count) / followerCount * 100).toFixed(2)
      : '0.00'

    try {
      const GrokAPI = (await import('./grokAPI')).default
      const grok = new GrokAPI()

      const analysis = await grok.analyzeTweetPerformance(
        post.text,
        {
          likes: metrics.like_count,
          retweets: metrics.repost_count,
          replies: metrics.reply_count,
          engagement_rate: engagementRate,
          impressions: this.calculatePostReach(post, followerCount)
        }
      )

      if (!analysis) {
        // Return post without AI analysis if Grok fails
        return post
      }

      return {
        ...post,
        ai_analysis: {
          ...analysis,
          analyzed_at: new Date().toISOString(),
          analyzer: 'grok-2-latest'
        }
      }
    } catch (error) {
      console.error('Error analyzing top post with Grok:', error)
      // Return post without AI analysis if it fails
      return post
    }
  }

  // Analyze sentiment using context annotations and keywords
  analyzeSentiment(posts: any[]): { positive: number; negative: number; neutral: number } {
    if (!posts.length) return { positive: 0, negative: 0, neutral: 0 }

    const positiveKeywords = ['great', 'awesome', 'amazing', 'love', 'excellent', 'fantastic', 'wonderful', 'perfect', 'best', 'incredible']
    const negativeKeywords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'failed', 'broken', 'useless']

    let positive = 0
    let negative = 0
    let neutral = 0

    posts.forEach(post => {
      const text = post.text.toLowerCase()
      const hasPositive = positiveKeywords.some(word => text.includes(word))
      const hasNegative = negativeKeywords.some(word => text.includes(word))

      if (hasPositive && !hasNegative) {
        positive++
      } else if (hasNegative && !hasPositive) {
        negative++
      } else {
        neutral++
      }
    })

    const total = posts.length
    return {
      positive: Math.round((positive / total) * 100),
      negative: Math.round((negative / total) * 100),
      neutral: Math.round((neutral / total) * 100)
    }
  }

  // Get comprehensive analytics for a user
  async getAnalytics(username: string): Promise<XAnalyticsData> {
    try {
      // Get user data
      const user = await this.getUserByUsername(username)
      if (!user) {
        throw new Error('User not found')
      }

      // Get recent posts
      const posts = await this.getUserTweets(user.id, 20)
      
      console.log(`[Analytics] Fetched ${posts.length} posts for @${username}`)
      
      // Calculate metrics using 1% virality model
      const engagementRate = this.calculateEngagementRate(posts, user.public_metrics.followers_count)
      const topPost = this.findTopPerformingPost(posts)
      const mostRecentPost = posts[0] || null // First post is most recent
      const sentiment = this.analyzeSentiment(posts)
      
      console.log(`[Analytics] Most recent post:`, mostRecentPost?.text?.substring(0, 50))
      console.log(`[Analytics] Top performing post:`, topPost?.text?.substring(0, 50))
      console.log(`[Analytics] Are they the same?`, mostRecentPost?.id === topPost?.id)

      // Add AI analysis to top performing post (with Grok)
      const topPostWithAnalysis = await this.analyzeTopPost(topPost, user.public_metrics.followers_count)
      
      // Add AI analysis to most recent post if different from top
      let recentPostWithAnalysis = mostRecentPost
      if (mostRecentPost && topPost && mostRecentPost.id !== topPost.id) {
        recentPostWithAnalysis = await this.analyzeTopPost(mostRecentPost, user.public_metrics.followers_count)
      }

      // Generate overall account strategy recommendations
      const accountStrategy = await this.analyzeAccountStrategy(posts, username, user.public_metrics.followers_count)

      // Calculate totals
      const totalEngagements = posts.reduce((sum, post) => {
        const metrics = post.public_metrics
        if (!metrics) return sum
        return sum + (metrics.like_count + metrics.repost_count + metrics.reply_count + metrics.quote_count)
      }, 0)

      // Calculate total reach using 1% virality model
      const totalReach = posts.reduce((sum, post) => {
        return sum + this.calculatePostReach(post, user.public_metrics.followers_count)
      }, 0)

      return {
        user_metrics: user.public_metrics,
        recent_tweets: posts,
        engagement_rate: Math.round(engagementRate * 100) / 100,
        top_performing_tweet: topPostWithAnalysis,
        most_recent_tweet: recentPostWithAnalysis,
        account_strategy: accountStrategy, // NEW: Overall strategic recommendations
        total_impressions: Math.round(totalReach),
        total_engagements: totalEngagements,
        growth_metrics: {
          followers_growth: 0, // Would need historical data
          engagement_growth: 0 // Would need historical data
        },
        sentiment_analysis: sentiment
      }
    } catch (error) {
      console.error('Error getting analytics:', error)
      throw error
    }
  }

  // Search for tweets by query (for competitor analysis)
  async searchTweets(query: string, maxResults: number = 10): Promise<any[]> {
    try {
      const tweets = await this.client.v2.search(query, {
        max_results: maxResults,
        'tweet.fields': [
          'public_metrics',
          'created_at',
          'context_annotations',
          'author_id'
        ]
      })

      return tweets.data?.data || []
    } catch (error) {
      console.error('Error searching tweets:', error)
      throw new Error('Failed to search tweets')
    }
  }

  // Get trending topics
  async getTrendingTopics(woeid: number = 1): Promise<any[]> {
    try {
      // Note: Trends endpoint requires different authentication
      // This would need OAuth 1.0a or elevated access
      console.log('Trending topics require elevated API access')
      return []
    } catch (error) {
      console.error('Error fetching trends:', error)
      return []
    }
  }

  // COMPREHENSIVE X API ENDPOINTS - Maximize $200/month Value

  // Get user's followers (with pagination)
  async getUserFollowers(userId: string, maxResults: number = 100): Promise<any[]> {
    try {
      const followers = await this.client.v2.followers(userId, {
        max_results: maxResults,
        'user.fields': ['public_metrics', 'verified', 'created_at', 'description']
      })
      return followers.data || []
    } catch (error) {
      console.error('Error fetching followers:', error)
      throw new Error('Failed to fetch followers from X API')
    }
  }

  // Get user's following (with pagination)
  async getUserFollowing(userId: string, maxResults: number = 100): Promise<any[]> {
    try {
      const following = await this.client.v2.following(userId, {
        max_results: maxResults,
        'user.fields': ['public_metrics', 'verified', 'created_at', 'description']
      })
      return following.data || []
    } catch (error) {
      console.error('Error fetching following:', error)
      throw new Error('Failed to fetch following from X API')
    }
  }

  // Get tweet likes/liking users
  async getTweetLikes(tweetId: string, maxResults: number = 100): Promise<any[]> {
    try {
      const likes = await this.client.v2.tweetLikedBy(tweetId, {
        max_results: maxResults,
        'user.fields': ['public_metrics', 'verified']
      })
      return likes.data || []
    } catch (error) {
      console.error('Error fetching tweet likes:', error)
      return []
    }
  }

  // Get tweet retweets/retweeting users
  async getTweetRetweets(tweetId: string, maxResults: number = 100): Promise<any[]> {
    try {
      const retweets = await this.client.v2.tweetRetweetedBy(tweetId, {
        max_results: maxResults,
        'user.fields': ['public_metrics', 'verified']
      })
      return retweets.data || []
    } catch (error) {
      console.error('Error fetching tweet retweets:', error)
      return []
    }
  }

  // Get tweet quotes
  async getTweetQuotes(tweetId: string, maxResults: number = 100): Promise<any[]> {
    try {
      const quotes = await this.client.v2.quotes(tweetId, {
        max_results: maxResults,
        'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
        'user.fields': ['public_metrics', 'verified']
      })
      return quotes.data?.data || []
    } catch (error) {
      console.error('Error fetching tweet quotes:', error)
      return []
    }
  }

  // Advanced search with filters
  async advancedSearch(query: string, options: any = {}): Promise<any[]> {
    try {
      const searchOptions = {
        max_results: options.maxResults || 100,
        'tweet.fields': [
          'public_metrics',
          'created_at',
          'context_annotations',
          'author_id',
          'lang',
          'possibly_sensitive',
          'referenced_tweets'
        ],
        'user.fields': ['public_metrics', 'verified'],
        ...options
      }

      const tweets = await this.client.v2.search(query, searchOptions)
      return tweets.data?.data || []
    } catch (error) {
      console.error('Error in advanced search:', error)
      throw new Error('Failed to perform advanced search')
    }
  }

  // Get user mentions
  async getUserMentions(userId: string, maxResults: number = 100): Promise<any[]> {
    try {
      const mentions = await this.client.v2.userMentionTimeline(userId, {
        max_results: maxResults,
        'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
        'user.fields': ['public_metrics', 'verified']
      })
      return mentions.data?.data || []
    } catch (error) {
      console.error('Error fetching mentions:', error)
      return []
    }
  }

  // Get spaces by user
  async getUserSpaces(userId: string): Promise<any[]> {
    try {
      const spaces = await this.client.v2.spacesByCreators([userId], {
        'space.fields': ['participant_count', 'subscriber_count', 'created_at', 'state']
      })
      return spaces.data || []
    } catch (error) {
      console.error('Error fetching spaces:', error)
      return []
    }
  }

  // Comprehensive competitor analysis
  async getCompetitorAnalysis(usernames: string[]): Promise<any> {
    try {
      const analyses = await Promise.all(
        usernames.map(async (username) => {
          try {
            const analytics = await this.getAnalytics(username)
            return { username, ...analytics }
          } catch (error) {
            return { username, error: (error as Error).message }
          }
        })
      )

      return {
        competitors: analyses,
        comparison: this.compareCompetitors(analyses.filter(a => !a.error))
      }
    } catch (error) {
      console.error('Error in competitor analysis:', error)
      throw new Error('Failed to perform competitor analysis')
    }
  }

  // Compare competitors
  private compareCompetitors(competitors: any[]): any {
    if (!competitors.length) return {}

    const metrics = {
      avgFollowers: competitors.reduce((sum, c) => sum + c.user_metrics.followers_count, 0) / competitors.length,
      avgEngagement: competitors.reduce((sum, c) => sum + c.engagement_rate, 0) / competitors.length,
      topPerformer: competitors.reduce((top, current) => 
        current.engagement_rate > top.engagement_rate ? current : top
      ),
      mostFollowed: competitors.reduce((top, current) => 
        current.user_metrics.followers_count > top.user_metrics.followers_count ? current : top
      )
    }

    return metrics
  }

  // Hashtag analysis
  async analyzeHashtag(hashtag: string, maxResults: number = 100): Promise<any> {
    try {
      // Validate X API token
      if (!process.env.X_BEARER_TOKEN) {
        throw new Error('X API credentials not configured')
      }

      const query = `#${hashtag.replace('#', '')}`
      
      // Search for hashtag with proper error handling
      const searchOptions = {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
        'user.fields': ['username', 'name', 'public_metrics', 'verified'],
        expansions: 'author_id'
      }

      const searchResults = await this.client.v2.search(query, searchOptions as any)
      const posts = searchResults.data?.data || []
      const users = searchResults.data?.includes?.users || []

      if (posts.length === 0) {
        return {
          hashtag: `#${hashtag.replace('#', '')}`,
          totalTweets: 0,
          totalEngagement: 0,
          avgEngagement: 0,
          topTweet: null,
          tweets: [],
          message: 'No tweets found for this hashtag in the last 7 days'
        }
      }

      // Create user lookup map
      const userMap = new Map(users.map(u => [u.id, u]))
      
      // Add author info to posts
      const enrichedPosts = posts.map(post => ({
        ...post,
        author: userMap.get(post.author_id!)
      }))

      const totalEngagement = enrichedPosts.reduce((sum, post) => {
        const metrics = post.public_metrics as any
        if (!metrics) return sum
        return sum + (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0)
      }, 0)

      const avgEngagement = posts.length ? totalEngagement / posts.length : 0
      const topPost = this.findTopPerformingPost(enrichedPosts)

      // Calculate hashtag velocity (tweets per hour in last 7 days)
      const now = new Date()
      const recentPosts = enrichedPosts.filter(p => {
        if (!p.created_at) return false
        const postTime = new Date(p.created_at)
        const hoursDiff = (now.getTime() - postTime.getTime()) / (1000 * 60 * 60)
        return hoursDiff <= 168 // 7 days
      })
      const velocity = recentPosts.length / 168 // tweets per hour

      return {
        hashtag: `#${hashtag.replace('#', '')}`,
        totalTweets: posts.length,
        totalEngagement,
        avgEngagement: Math.round(avgEngagement),
        velocity: Math.round(velocity * 10) / 10, // tweets/hour
        topTweet: topPost,
        recent_tweets: enrichedPosts.slice(0, 10), // Top 10 posts by relevance
        analyzed_at: new Date().toISOString()
      }
    } catch (error: any) {
      console.error('Error analyzing hashtag:', error)
      
      // Better error messages
      if (error.code === 429) {
        throw new Error('X API rate limit exceeded. Please try again in 15 minutes.')
      }
      if (error.code === 401) {
        throw new Error('X API authentication failed. Please check API credentials.')
      }
      
      throw new Error(`Failed to analyze hashtag: ${error.message}`)
    }
  }

  // Viral content detection
  async findViralContent(query: string = '', minLikes: number = 10000): Promise<any[]> {
    try {
      const searchQuery = query || 'lang:en -is:retweet'
      const tweets = await this.advancedSearch(searchQuery, {
        maxResults: 100,
        sort_order: 'relevancy'
      })

      return tweets.filter(tweet => {
        const metrics = tweet.public_metrics
        return metrics && metrics.like_count >= minLikes
      }).sort((a, b) => {
        const aScore = a.public_metrics.like_count + a.public_metrics.retweet_count * 2
        const bScore = b.public_metrics.like_count + b.public_metrics.retweet_count * 2
        return bScore - aScore
      })
    } catch (error) {
      console.error('Error finding viral content:', error)
      return []
    }
  }
}

export default XAPIService
export type { XAnalyticsData, XTweet, XUserMetrics }
