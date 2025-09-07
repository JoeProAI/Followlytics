import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { trackAPIUsage } from '@/lib/usage-tracker'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

// Initialize Firebase Admin SDK
let adminSDK: any = null

async function getFirebaseAdmin() {
  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    
    if (getApps().length === 0) {
      // Try using service account key first (if available)
      const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY
      
      if (serviceAccountKey) {
        try {
          console.log('Attempting to parse service account JSON, length:', serviceAccountKey.length)
          const serviceAccount = JSON.parse(serviceAccountKey)
          console.log('Service account parsed successfully, project_id:', serviceAccount.project_id)
          initializeApp({
            credential: cert(serviceAccount)
          })
        } catch (jsonError) {
          console.error('Failed to parse service account JSON:', jsonError)
          console.log('Service account key preview:', serviceAccountKey.substring(0, 100) + '...')
          // Fall through to individual environment variables instead of throwing
        }
      }
      
      // Use individual environment variables (either as fallback or primary)
      if (getApps().length === 0) {
        // Fallback to individual environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
        let privateKey = process.env.FIREBASE_PRIVATE_KEY
        
        if (privateKey) {
          // Enhanced private key processing
          privateKey = privateKey
            .replace(/^["']|["']$/g, '') // Remove outer quotes
            .replace(/\\n/g, '\n') // Convert escaped newlines
            .trim()
          
          // More flexible PEM validation - check for key boundaries after processing
          const hasBeginMarker = privateKey.includes('-----BEGIN PRIVATE KEY-----') || privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')
          const hasEndMarker = privateKey.includes('-----END PRIVATE KEY-----') || privateKey.includes('-----END RSA PRIVATE KEY-----')
          
          if (!hasBeginMarker || !hasEndMarker) {
            console.log('Private key validation failed. Key preview:', privateKey.substring(0, 50) + '...')
            console.log('Has begin marker:', hasBeginMarker, 'Has end marker:', hasEndMarker)
            throw new Error('Invalid private key format - must be PEM format')
          }
        }
        
        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(`Missing Firebase config: projectId=${projectId || 'MISSING'}, clientEmail=${clientEmail || 'MISSING'}, privateKey=${privateKey ? 'SET' : 'MISSING'}`)
        }
        
        initializeApp({
          credential: cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: privateKey
          })
        })
      }
    }
    
    return { firestore: getFirestore }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    throw error
  }
}

async function runTwintCommand(username: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    console.log('Running Twint Python script for username:', username)
    
    // Create a Python script that uses web scraping to get followers directly
    const pythonScript = `
import requests
import json
import sys
import re
from bs4 import BeautifulSoup
import time

try:
    # Use direct web scraping approach similar to what Twint does internally
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    followers = []
    
    # Try to scrape Twitter followers page directly
    url = f'https://twitter.com/${username}/followers'
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for username patterns in the HTML
            text_content = soup.get_text()
            
            # Extract usernames using regex patterns
            username_patterns = [
                r'@([a-zA-Z0-9_]{3,15})',
                r'"screen_name":"([a-zA-Z0-9_]{3,15})"',
                r'data-screen-name="([a-zA-Z0-9_]{3,15})"'
            ]
            
            seen_users = set()
            for pattern in username_patterns:
                matches = re.findall(pattern, text_content)
                for match in matches:
                    username_lower = match.lower()
                    if (username_lower not in seen_users and 
                        username_lower != '${username}'.lower() and
                        len(username_lower) >= 3 and
                        len(username_lower) <= 15):
                        seen_users.add(username_lower)
                        followers.append(username_lower)
            
            # Also try to find followers in script tags (JSON data)
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string:
                    script_content = script.string
                    # Look for user objects in JSON
                    user_matches = re.findall(r'"screen_name":"([a-zA-Z0-9_]{3,15})"', script_content)
                    for match in user_matches:
                        username_lower = match.lower()
                        if (username_lower not in seen_users and 
                            username_lower != '${username}'.lower() and
                            len(username_lower) >= 3):
                            seen_users.add(username_lower)
                            followers.append(username_lower)
    
    except requests.RequestException as e:
        print(json.dumps({"error": f"Request failed: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    
    # Always try multiple approaches to get comprehensive follower data
    
    # Approach 2: Search for mentions/replies to the user
    search_queries = [
        f'to%3A${username}',  # Direct mentions
        f'%40${username}',    # @username mentions
        f'${username}%20OR%20%40${username}'  # Combined search
    ]
    
    for query in search_queries:
        try:
            search_url = f'https://twitter.com/search?q={query}&src=typed_query&f=user'
            response = requests.get(search_url, headers=headers, timeout=30)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                text_content = soup.get_text()
                
                # Extract usernames from search results
                mention_matches = re.findall(r'@([a-zA-Z0-9_]{3,15})', text_content)
                for match in mention_matches:
                    username_lower = match.lower()
                    if (username_lower not in seen_users and 
                        username_lower != '${username}'.lower() and
                        len(username_lower) >= 3):
                        seen_users.add(username_lower)
                        followers.append(username_lower)
                
                # Also look for user profile links
                profile_matches = re.findall(r'twitter\\.com/([a-zA-Z0-9_]{3,15})', text_content)
                for match in profile_matches:
                    username_lower = match.lower()
                    if (username_lower not in seen_users and 
                        username_lower != '${username}'.lower() and
                        len(username_lower) >= 3):
                        seen_users.add(username_lower)
                        followers.append(username_lower)
            
            # Add delay between requests to avoid rate limiting
            time.sleep(2)
        except:
            continue  # Try next query
    
    # Approach 3: Try to get followers from user's recent tweets (people who interact)
    try:
        tweets_url = f'https://twitter.com/${username}'
        response = requests.get(tweets_url, headers=headers, timeout=30)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            text_content = soup.get_text()
            
            # Look for interaction patterns (replies, mentions in tweets)
            interaction_matches = re.findall(r'@([a-zA-Z0-9_]{3,15})', text_content)
            for match in interaction_matches:
                username_lower = match.lower()
                if (username_lower not in seen_users and 
                    username_lower != '${username}'.lower() and
                    len(username_lower) >= 3):
                    seen_users.add(username_lower)
                    followers.append(username_lower)
    except:
        pass
    
    # Approach 4: Try alternative Twitter URLs and mobile version
    alternative_urls = [
        f'https://mobile.twitter.com/${username}/followers',
        f'https://x.com/${username}/followers',
        f'https://mobile.x.com/${username}/followers'
    ]
    
    for alt_url in alternative_urls:
        try:
            response = requests.get(alt_url, headers=headers, timeout=30)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                text_content = soup.get_text()
                
                # Extract usernames using all patterns
                for pattern in username_patterns:
                    matches = re.findall(pattern, text_content)
                    for match in matches:
                        username_lower = match.lower()
                        if (username_lower not in seen_users and 
                            username_lower != '${username}'.lower() and
                            len(username_lower) >= 3 and
                            len(username_lower) <= 15):
                            seen_users.add(username_lower)
                            followers.append(username_lower)
            
            time.sleep(1)  # Rate limiting
        except:
            continue
    
    # Remove duplicates and return all followers (no limit)
    unique_followers = list(set(followers))
    print(json.dumps(unique_followers))
    
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`
    
    const twintProcess = spawn('python', ['-c', pythonScript], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    let stdout = ''
    let stderr = ''
    
    twintProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    twintProcess.stderr.on('data', (data) => {
      stderr += data.toString()
      console.log('Twint stderr:', data.toString())
    })
    
    twintProcess.on('close', async (code) => {
      console.log('Twint process exited with code:', code)
      console.log('Stdout:', stdout)
      
      try {
        if (code === 0 && stdout.trim()) {
          const result = JSON.parse(stdout.trim())
          if (Array.isArray(result)) {
            console.log(`Twint found ${result.length} followers`)
            resolve(result)
          } else {
            reject(new Error('Invalid response format from Twint'))
          }
        } else {
          const errorMsg = stderr || 'Twint process failed'
          reject(new Error(errorMsg))
        }
      } catch (parseError) {
        console.error('Error parsing Twint output:', parseError)
        reject(new Error(`Failed to parse Twint output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`))
      }
    })
    
    twintProcess.on('error', (error) => {
      console.error('Twint process error:', error)
      reject(new Error(`Twint execution failed: ${error.message}`))
    })
    
    // Set timeout for the process (increased for comprehensive scraping)
    setTimeout(() => {
      twintProcess.kill('SIGTERM')
      reject(new Error('Twint process timed out after 180 seconds'))
    }, 180000)
  })
}

export async function POST(request: NextRequest) {
  console.log('=== FOLLOWERS TWINT ENDPOINT CALLED ===')
  try {
    // Get user from Firebase token
    const cookieStore = cookies()
    const token = cookieStore.get('firebase_token')?.value
    console.log('Firebase token exists:', !!token)
    
    if (!token) {
      console.log('No Firebase token found')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let userId
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) throw new Error('Invalid token format')
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      userId = payload.uid
      console.log('Extracted user ID:', userId)
      if (!userId) throw new Error('No user ID in token')
    } catch (error) {
      console.log('Token parsing error:', error)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Track API usage
    try {
      await trackAPIUsage(userId, 'followers-twint', 1)
      console.log('Usage tracking completed successfully')
    } catch (error) {
      console.error('Usage tracking error:', error)
      return NextResponse.json(
        { error: (error as Error).message, code: 'USAGE_LIMIT_EXCEEDED' },
        { status: 429 }
      )
    }

    // Get user data from Firestore
    console.log('Initializing Firebase for user:', userId)
    const firebase = await getFirebaseAdmin()
    console.log('Firebase initialized, fetching user document')
    
    const userDoc = await firebase.firestore().collection('users').doc(userId).get()
    console.log('User document exists:', userDoc.exists)
    
    if (!userDoc.exists) {
      console.log('User document not found for ID:', userId)
      return NextResponse.json({ error: 'User not found in database. Please log in again.', code: 'USER_NOT_FOUND' }, { status: 404 })
    }

    const userData = userDoc.data()
    
    // The username is stored as 'username' field from Twitter's screen_name
    const username = userData?.username
    if (!userData || !username) {
      return NextResponse.json({ error: 'Twitter username not found. Please log in again.', code: 'MISSING_USERNAME' }, { status: 401 })
    }

    console.log('Starting Twint follower scraping for username:', username)

    try {
      // Run Twint to get followers
      const followers = await runTwintCommand(username)
      console.log(`Twint extracted ${followers.length} followers`)
      
      if (followers.length === 0) {
        return NextResponse.json({
          error: 'No followers found',
          details: 'Web scraping did not return any follower data. This could be due to account privacy settings, rate limiting, or Twitter\'s anti-bot measures.',
          service: 'twint'
        }, { status: 404 })
      }

      // Convert to expected format (no limit on followers)
      const followersData = followers.map((followerUsername, index) => ({
        id: `twint_${index}`,
        username: followerUsername,
        name: followerUsername,
        profile_image_url: '',
        followers_count: 0,
        following_count: 0,
        tweet_count: 0,
        verified: false,
        source: 'twint'
      }))

      // Store followers in Firestore
      const db = firebase.firestore()
      const batch = db.batch()
      
      // Clear existing followers from this source
      const existingFollowersQuery = db
        .collection('users')
        .doc(userId)
        .collection('followers')
        .where('source', '==', 'twint')
      
      const existingFollowers = await existingFollowersQuery.get()
      existingFollowers.docs.forEach((doc: any) => {
        batch.delete(doc.ref)
      })
      
      // Add new followers
      followersData.forEach((follower, index) => {
        const followerRef = db
          .collection('users')
          .doc(userId)
          .collection('followers')
          .doc(`twint_${index}`)
        
        batch.set(followerRef, {
          username: follower.username,
          source: 'twint',
          scanned_at: new Date(),
          user_id: userId
        })
      })
      
      await batch.commit()
      console.log(`Stored ${followersData.length} followers in Firestore`)

      return NextResponse.json({
        success: true,
        followers_count: followersData.length,
        followers: followersData,
        scan_method: 'twint',
        message: `Successfully scraped ${followersData.length} followers using Twint`
      })

    } catch (twintError) {
      console.error('Twint execution error:', twintError)
      return NextResponse.json({
        error: 'Twint scraping failed',
        details: twintError instanceof Error ? twintError.message : 'Unknown Twint error',
        service: 'twint'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Twint follower scan error:', error)
    return NextResponse.json({
      error: 'Internal server error during Twint scan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
