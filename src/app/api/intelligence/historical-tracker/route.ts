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

    const { username, action = 'start' } = await request.json()
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Initialize Daytona
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY!,
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    })

    if (action === 'start') {
      // Start historical tracking for this user
      
      // Create Daytona sandbox for historical tracking
      console.log('Creating Daytona sandbox for historical tracking...')
      
      const workspace = await daytona.create({
        target: 'local',
        id: `historical-${username}-${Date.now()}`
      })

      const sandboxId = workspace.id
      console.log('Sandbox created:', sandboxId)

      // Python script for historical tracking
      const trackerScript = `
import os
import json
import time
import psycopg2
from datetime import datetime
from twitter_api_v2 import TwitterApi

# Initialize X API
bearer_token = "${process.env.X_BEARER_TOKEN}"
client = TwitterApi(bearer_token)

# Database connection
db_conn = psycopg2.connect(
    host="localhost",
    database="xanalytics",
    user="postgres",
    password="postgres"
)
cursor = db_conn.cursor()

# Create tables if not exist
cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_tweets (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255),
        tweet_id VARCHAR(255) UNIQUE,
        text TEXT,
        created_at TIMESTAMP,
        like_count INTEGER,
        retweet_count INTEGER,
        reply_count INTEGER,
        quote_count INTEGER,
        impression_count INTEGER,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_metrics (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255),
        followers_count INTEGER,
        following_count INTEGER,
        tweet_count INTEGER,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
db_conn.commit()

def fetch_and_store_tweets(username):
    """Fetch user's recent tweets and store in database"""
    try:
        # Get user
        user = client.get_user(username=username, user_fields=['public_metrics'])
        user_data = user.data
        
        # Store user metrics
        cursor.execute("""
            INSERT INTO user_metrics (username, followers_count, following_count, tweet_count)
            VALUES (%s, %s, %s, %s)
        """, (
            username,
            user_data.public_metrics['followers_count'],
            user_data.public_metrics['following_count'],
            user_data.public_metrics['tweet_count']
        ))
        
        # Get tweets
        tweets = client.get_users_tweets(
            id=user_data.id,
            max_results=100,
            tweet_fields=['public_metrics', 'created_at'],
            exclude=['retweets', 'replies']
        )
        
        if not tweets.data:
            print(f"No tweets found for {username}")
            return 0
        
        stored_count = 0
        for tweet in tweets.data:
            try:
                cursor.execute("""
                    INSERT INTO user_tweets 
                    (username, tweet_id, text, created_at, like_count, retweet_count, reply_count, quote_count)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (tweet_id) DO UPDATE SET
                        like_count = EXCLUDED.like_count,
                        retweet_count = EXCLUDED.retweet_count,
                        reply_count = EXCLUDED.reply_count,
                        quote_count = EXCLUDED.quote_count
                """, (
                    username,
                    tweet.id,
                    tweet.text,
                    tweet.created_at,
                    tweet.public_metrics['like_count'],
                    tweet.public_metrics['retweet_count'],
                    tweet.public_metrics['reply_count'],
                    tweet.public_metrics['quote_count']
                ))
                stored_count += 1
            except Exception as e:
                print(f"Error storing tweet {tweet.id}: {e}")
                continue
        
        db_conn.commit()
        print(f"Stored {stored_count} tweets for {username}")
        return stored_count
        
    except Exception as e:
        print(f"Error fetching tweets: {e}")
        db_conn.rollback()
        return 0

# Run initial fetch
username = "${username.replace('@', '')}"
print(f"Starting historical tracking for @{username}")
count = fetch_and_store_tweets(username)
print(f"Initial fetch complete: {count} tweets stored")

# Continuous tracking (run every 6 hours)
while True:
    time.sleep(6 * 60 * 60)  # 6 hours
    print(f"Fetching updates for @{username}...")
    fetch_and_store_tweets(username)
`

      // Write script to sandbox
      await daytona.fs.writeFile(sandboxId, '/tmp/historical_tracker.py', trackerScript)

      // Install dependencies
      console.log('Installing dependencies...')
      await daytona.process.exec(sandboxId, {
        cmd: 'pip3 install tweepy psycopg2-binary python-dotenv'
      })

      // Start PostgreSQL
      console.log('Starting PostgreSQL...')
      await daytona.process.exec(sandboxId, {
        cmd: 'apt-get update && apt-get install -y postgresql postgresql-contrib'
      })
      
      await daytona.process.exec(sandboxId, {
        cmd: 'service postgresql start'
      })

      // Run tracker in background
      console.log('Starting historical tracker...')
      await daytona.process.exec(sandboxId, {
        cmd: 'nohup python3 /tmp/historical_tracker.py > /tmp/tracker.log 2>&1 &'
      })

      return NextResponse.json({
        success: true,
        message: 'Historical tracking started',
        sandboxId,
        username,
        note: 'Tracking will run continuously. Check back in 24 hours for initial insights.'
      })

    } else if (action === 'query') {
      // Query historical data
      // This would connect to the existing sandbox and query the database
      // For now, return placeholder
      
      return NextResponse.json({
        success: true,
        message: 'Historical data query',
        data: {
          trends: 'Coming soon - need to implement query logic'
        }
      })
    }

  } catch (error: any) {
    console.error('Historical Tracker API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to start historical tracking',
      details: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Historical Tweet Tracker API',
    actions: {
      'start': 'Start tracking user tweets over time',
      'query': 'Query historical data and trends'
    },
    usage: 'POST with { username: "elonmusk", action: "start|query" }'
  })
}
