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

  // Find top performing post (minimum engagement threshold to ensure quality)
  findTopPerformingPost(posts: any[]): any | null {
    if (!posts.length) return null

    // Filter posts with meaningful engagement (at least 3 total engagements)
    const engagedPosts = posts.filter(post => {
      if (!post.public_metrics) return false
      const totalEng = post.public_metrics.like_count + 
                      post.public_metrics.repost_count + 
                      post.public_metrics.reply_count
      return totalEng >= 3
    })

    // If no posts meet threshold, return the most engaged post anyway
    const postsToAnalyze = engagedPosts.length > 0 ? engagedPosts : posts

    return postsToAnalyze.reduce((top, current) => {
      if (!current.public_metrics || !top.public_metrics) return top
      
      const currentScore = current.public_metrics.like_count + 
                          current.public_metrics.repost_count * 2 + 
                          current.public_metrics.reply_count * 1.5
      const topScore = top.public_metrics.like_count + 
                      top.public_metrics.repost_count * 2 + 
                      top.public_metrics.reply_count * 1.5
      
      return currentScore > topScore ? current : top
    })
  }

  // Analyze why a post performed well using AI
  async analyzeTopPost(post: any, followerCount: number): Promise<any> {
    if (!post) return null

    const metrics = post.public_metrics
    const engagementRate = followerCount > 0 
      ? ((metrics.like_count + metrics.repost_count + metrics.reply_count) / followerCount * 100).toFixed(2)
      : '0.00'

    try {
      const OpenAI = (await import('openai')).default
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      const analysis = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert social media analyst. Analyze why this X/Twitter post performed well and provide actionable improvement suggestions. Be specific and data-driven.`
          },
          {
            role: 'user',
            content: `Analyze this post:

TEXT: "${post.text}"

METRICS:
- Likes: ${metrics.like_count}
- Retweets: ${metrics.repost_count}
- Replies: ${metrics.reply_count}
- Engagement Rate: ${engagementRate}%
- Impressions (estimated): ${this.calculatePostReach(post, followerCount)}

Provide:
1. Why it performed well (2-3 specific reasons)
2. Key success factors (hook, content type, timing, etc.)
3. How to improve (2-3 actionable suggestions)

Return ONLY a JSON object:
{
  "performance_score": 1-100,
  "why_it_worked": ["reason1", "reason2"],
  "success_factors": ["factor1", "factor2"],
  "improvements": ["suggestion1", "suggestion2"],
  "content_type": "educational|entertaining|promotional|thread|viral"
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })

      const aiResponse = analysis.choices[0]?.message?.content
      if (!aiResponse) throw new Error('No AI response')

      let parsedAnalysis
      try {
        parsedAnalysis = JSON.parse(aiResponse)
      } catch {
        // Try to extract JSON from markdown
        const jsonMatch = aiResponse.match(/```json\n([\s\S]+?)\n```/) || aiResponse.match(/```\n([\s\S]+?)\n```/)
        if (jsonMatch) {
          parsedAnalysis = JSON.parse(jsonMatch[1])
        } else {
          throw new Error('Failed to parse AI response')
        }
      }

      return {
        ...post,
        ai_analysis: {
          ...parsedAnalysis,
          analyzed_at: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Error analyzing top post:', error)
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
      
      // Calculate metrics using 1% virality model
      const engagementRate = this.calculateEngagementRate(posts, user.public_metrics.followers_count)
      const topPost = this.findTopPerformingPost(posts)
      const sentiment = this.analyzeSentiment(posts)

      // Add AI analysis to top performing post
      const topPostWithAnalysis = await this.analyzeTopPost(topPost, user.public_metrics.followers_count)

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
      const query = `#${hashtag.replace('#', '')}`
      const posts = await this.advancedSearch(query, { maxResults })
      
      const totalEngagement = posts.reduce((sum, post) => {
        const metrics = post.public_metrics
        if (!metrics) return sum
        return sum + metrics.like_count + metrics.repost_count + metrics.reply_count
      }, 0)

      const avgEngagement = posts.length ? totalEngagement / posts.length : 0
      const topPost = this.findTopPerformingPost(posts)

      return {
        hashtag: `#${hashtag.replace('#', '')}`,
        totalTweets: posts.length,
        totalEngagement,
        avgEngagement: Math.round(avgEngagement),
        topTweet: topPost,
        tweets: posts.slice(0, 10) // Top 10 posts
      }
    } catch (error) {
      console.error('Error analyzing hashtag:', error)
      throw new Error('Failed to analyze hashtag')
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
