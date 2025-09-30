import { NextRequest, NextResponse } from 'next/server'
import XAPIService from '@/lib/xapi'
import { adminAuth as auth } from '@/lib/firebase-admin'
import { Daytona } from '@daytonaio/sdk'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await auth.verifyIdToken(token)
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { username } = await request.json()
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    console.log(`Starting content analysis for @${username}...`)

    // Initialize Daytona for heavy computation
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY!,
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    })

    // Create sandbox
    const workspace = await daytona.create({
      target: 'local',
      id: `content-analysis-${username}-${Date.now()}`
    })

    const sandboxId = workspace.id
    console.log('Sandbox created:', sandboxId)

    // Python script for deep content analysis
    const analysisScript = `
import json
import re
from collections import Counter
from datetime import datetime
from twitter_api_v2 import TwitterApi

# Initialize X API
bearer_token = "${process.env.X_BEARER_TOKEN}"
client = TwitterApi(bearer_token)

def analyze_content(username):
    """Deep content analysis of all user tweets"""
    
    # Get user
    user = client.get_user(username=username)
    user_data = user.data
    
    # Fetch ALL tweets (up to 3200)
    all_tweets = []
    pagination_token = None
    
    print(f"Fetching tweets for @{username}...")
    
    for i in range(32):  # 32 pages * 100 = 3200 tweets max
        try:
            tweets = client.get_users_tweets(
                id=user_data.id,
                max_results=100,
                tweet_fields=['public_metrics', 'created_at'],
                exclude=['retweets'],
                pagination_token=pagination_token
            )
            
            if not tweets.data:
                break
                
            all_tweets.extend(tweets.data)
            
            if not tweets.meta.get('next_token'):
                break
                
            pagination_token = tweets.meta['next_token']
            
        except Exception as e:
            print(f"Error fetching page {i}: {e}")
            break
    
    print(f"Fetched {len(all_tweets)} tweets")
    
    if not all_tweets:
        return {"error": "No tweets found"}
    
    # ANALYSIS
    analysis = {
        "total_tweets_analyzed": len(all_tweets),
        "date_range": {
            "oldest": str(all_tweets[-1].created_at) if all_tweets else None,
            "newest": str(all_tweets[0].created_at) if all_tweets else None
        }
    }
    
    # 1. Length Analysis
    lengths = [len(tweet.text) for tweet in all_tweets]
    engagements = [
        tweet.public_metrics['like_count'] + tweet.public_metrics['retweet_count'] * 2
        for tweet in all_tweets
    ]
    
    # Find optimal length
    length_engagement = {}
    for length, engagement in zip(lengths, engagements):
        bucket = (length // 50) * 50  # 50-char buckets
        if bucket not in length_engagement:
            length_engagement[bucket] = []
        length_engagement[bucket].append(engagement)
    
    avg_by_length = {
        length: sum(engs) / len(engs)
        for length, engs in length_engagement.items()
        if len(engs) > 2  # At least 3 tweets
    }
    
    best_length = max(avg_by_length.items(), key=lambda x: x[1]) if avg_by_length else (0, 0)
    
    analysis["length_analysis"] = {
        "average_length": sum(lengths) / len(lengths),
        "optimal_length_range": f"{best_length[0]}-{best_length[0] + 50}",
        "avg_engagement_at_optimal": round(best_length[1])
    }
    
    # 2. Timing Analysis
    hours = [datetime.fromisoformat(str(tweet.created_at).replace('Z', '+00:00')).hour for tweet in all_tweets]
    hour_engagement = {}
    for hour, engagement in zip(hours, engagements):
        if hour not in hour_engagement:
            hour_engagement[hour] = []
        hour_engagement[hour].append(engagement)
    
    avg_by_hour = {
        hour: sum(engs) / len(engs)
        for hour, engs in hour_engagement.items()
        if len(engs) > 2
    }
    
    best_hours = sorted(avg_by_hour.items(), key=lambda x: x[1], reverse=True)[:3]
    
    analysis["timing_analysis"] = {
        "best_hours_utc": [hour for hour, _ in best_hours],
        "best_hour_engagement": {
            f"{hour}:00": round(eng)
            for hour, eng in best_hours
        }
    }
    
    # 3. Content Pattern Analysis
    # Extract hashtags
    all_hashtags = []
    for tweet in all_tweets:
        hashtags = re.findall(r'#(\w+)', tweet.text)
        all_hashtags.extend(hashtags)
    
    hashtag_counts = Counter(all_hashtags)
    
    analysis["hashtag_analysis"] = {
        "unique_hashtags": len(hashtag_counts),
        "total_hashtags_used": len(all_hashtags),
        "most_common": dict(hashtag_counts.most_common(10))
    }
    
    # 4. Top Performing Tweets
    sorted_tweets = sorted(all_tweets, key=lambda t: t.public_metrics['like_count'] + t.public_metrics['retweet_count'] * 2, reverse=True)
    
    analysis["top_performers"] = [
        {
            "text": tweet.text,
            "likes": tweet.public_metrics['like_count'],
            "retweets": tweet.public_metrics['retweet_count'],
            "engagement": tweet.public_metrics['like_count'] + tweet.public_metrics['retweet_count'] * 2
        }
        for tweet in sorted_tweets[:5]
    ]
    
    # 5. Engagement Stats
    total_likes = sum(t.public_metrics['like_count'] for t in all_tweets)
    total_retweets = sum(t.public_metrics['retweet_count'] for t in all_tweets)
    
    analysis["engagement_stats"] = {
        "total_likes": total_likes,
        "total_retweets": total_retweets,
        "avg_likes_per_tweet": round(total_likes / len(all_tweets)),
        "avg_retweets_per_tweet": round(total_retweets / len(all_tweets)),
        "engagement_rate": round((total_likes + total_retweets * 2) / len(all_tweets))
    }
    
    # 6. Recommendations
    recommendations = []
    
    if best_length[0] > 0:
        recommendations.append(f"Your {best_length[0]}-{best_length[0]+50} character tweets get {round(best_length[1])} avg engagement")
    
    if best_hours:
        recommendations.append(f"Post at {best_hours[0][0]}:00 UTC for {round(best_hours[0][1])} avg engagement")
    
    if hashtag_counts:
        top_tag = hashtag_counts.most_common(1)[0]
        recommendations.append(f"#{top_tag[0]} is your most used hashtag ({top_tag[1]} times)")
    
    analysis["recommendations"] = recommendations
    
    return analysis

# Run analysis
username = "${username.replace('@', '')}"
result = analyze_content(username)
print(json.dumps(result, indent=2))
`

    // Write script
    await daytona.fs.writeFile(sandboxId, '/tmp/content_analysis.py', analysisScript)

    // Install dependencies
    console.log('Installing dependencies...')
    await daytona.process.exec(sandboxId, {
      cmd: 'pip3 install tweepy python-dotenv'
    })

    // Run analysis
    console.log('Running content analysis...')
    const result = await daytona.process.exec(sandboxId, {
      cmd: 'python3 /tmp/content_analysis.py'
    })

    // Parse output
    let analysisData
    try {
      const output = result.stdout || result.output
      analysisData = JSON.parse(output)
    } catch (e) {
      console.error('Failed to parse analysis output:', result)
      throw new Error('Analysis failed')
    }

    // Cleanup sandbox
    console.log('Cleaning up sandbox...')
    await daytona.delete(sandboxId)

    return NextResponse.json({
      success: true,
      username,
      analysis: analysisData,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Content Analysis API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze content',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Content Intelligence API',
    description: 'Analyzes ALL user tweets (up to 3200) to find patterns, optimal posting times, and content strategies',
    usage: 'POST with { username: "elonmusk" }',
    features: [
      'Optimal tweet length analysis',
      'Best posting times',
      'Hashtag performance',
      'Top performing tweets',
      'Engagement statistics',
      'Actionable recommendations'
    ]
  })
}
