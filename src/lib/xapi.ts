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

  // Calculate engagement rate
  calculateEngagementRate(tweets: any[], followerCount: number): number {
    if (!tweets.length || !followerCount) return 0

    const totalEngagements = tweets.reduce((sum, tweet) => {
      const metrics = tweet.public_metrics
      if (!metrics) return sum
      return sum + (metrics.like_count + metrics.retweet_count + metrics.reply_count + metrics.quote_count)
    }, 0)

    const totalImpressions = tweets.length * followerCount * 0.1 // Estimate 10% reach
    return totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0
  }

  // Find top performing tweet
  findTopPerformingTweet(tweets: any[]): any | null {
    if (!tweets.length) return null

    return tweets.reduce((top, current) => {
      if (!current.public_metrics || !top.public_metrics) return top
      
      const currentScore = current.public_metrics.like_count + 
                          current.public_metrics.retweet_count * 2 + 
                          current.public_metrics.reply_count * 1.5
      const topScore = top.public_metrics.like_count + 
                      top.public_metrics.retweet_count * 2 + 
                      top.public_metrics.reply_count * 1.5
      
      return currentScore > topScore ? current : top
    })
  }

  // Analyze sentiment using context annotations and keywords
  analyzeSentiment(tweets: any[]): { positive: number; negative: number; neutral: number } {
    if (!tweets.length) return { positive: 0, negative: 0, neutral: 0 }

    const positiveKeywords = ['great', 'awesome', 'amazing', 'love', 'excellent', 'fantastic', 'wonderful', 'perfect', 'best', 'incredible']
    const negativeKeywords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'failed', 'broken', 'useless']

    let positive = 0
    let negative = 0
    let neutral = 0

    tweets.forEach(tweet => {
      const text = tweet.text.toLowerCase()
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

    const total = tweets.length
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

      // Get recent tweets
      const tweets = await this.getUserTweets(user.id, 20)
      
      // Calculate metrics
      const engagementRate = this.calculateEngagementRate(tweets, user.public_metrics.followers_count)
      const topTweet = this.findTopPerformingTweet(tweets)
      const sentiment = this.analyzeSentiment(tweets)

      // Calculate totals
      const totalEngagements = tweets.reduce((sum, tweet) => {
        const metrics = tweet.public_metrics
        if (!metrics) return sum
        return sum + (metrics.like_count + metrics.retweet_count + metrics.reply_count + metrics.quote_count)
      }, 0)

      const totalImpressions = tweets.reduce((sum, tweet) => {
        const impressions = tweet.public_metrics?.impression_count || user.public_metrics.followers_count * 0.1
        return sum + impressions
      }, 0)

      return {
        user_metrics: user.public_metrics,
        recent_tweets: tweets,
        engagement_rate: Math.round(engagementRate * 100) / 100,
        top_performing_tweet: topTweet,
        total_impressions: Math.round(totalImpressions),
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
      const tweets = await this.advancedSearch(query, { maxResults })
      
      const totalEngagement = tweets.reduce((sum, tweet) => {
        const metrics = tweet.public_metrics
        if (!metrics) return sum
        return sum + metrics.like_count + metrics.retweet_count + metrics.reply_count
      }, 0)

      const avgEngagement = tweets.length ? totalEngagement / tweets.length : 0
      const topTweet = this.findTopPerformingTweet(tweets)

      return {
        hashtag: `#${hashtag.replace('#', '')}`,
        totalTweets: tweets.length,
        totalEngagement,
        avgEngagement: Math.round(avgEngagement),
        topTweet,
        tweets: tweets.slice(0, 10) // Top 10 tweets
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
