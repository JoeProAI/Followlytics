import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Initialize Firebase Admin SDK
let adminSDK: any = null

async function getFirebaseAdmin() {
  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    
    if (getApps().length === 0) {
      const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY
      
      if (serviceAccountKey) {
        try {
          const serviceAccount = JSON.parse(serviceAccountKey)
          initializeApp({
            credential: cert(serviceAccount)
          })
        } catch (jsonError) {
          console.error('Failed to parse service account JSON:', jsonError)
        }
      }
      
      if (getApps().length === 0) {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
        let privateKey = process.env.FIREBASE_PRIVATE_KEY
        
        if (privateKey) {
          privateKey = privateKey
            .replace(/^["']|["']$/g, '')
            .replace(/\\n/g, '\n')
            .trim()
        }
        
        if (projectId && clientEmail && privateKey) {
          initializeApp({
            credential: cert({
              projectId: projectId,
              clientEmail: clientEmail,
              privateKey: privateKey
            })
          })
        }
      }
    }
    
    return { firestore: getFirestore }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log('=== TWITTER ARCHIVE IMPORT ENDPOINT CALLED ===')
  try {
    // Get user from Firebase token
    const cookieStore = cookies()
    const token = cookieStore.get('firebase_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let userId
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) throw new Error('Invalid token format')
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      userId = payload.uid
      if (!userId) throw new Error('No user ID in token')
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parse the uploaded file
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const fileContent = await file.text()
    let followersData

    try {
      // Try to parse as JSON (Twitter archive format)
      const jsonData = JSON.parse(fileContent)
      
      // Handle different possible formats from Twitter archive
      if (jsonData.followers) {
        followersData = jsonData.followers
      } else if (Array.isArray(jsonData)) {
        followersData = jsonData
      } else if (jsonData.data && Array.isArray(jsonData.data)) {
        followersData = jsonData.data
      } else {
        return NextResponse.json({ 
          error: 'Invalid file format',
          details: 'Expected Twitter archive JSON with followers data'
        }, { status: 400 })
      }
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Failed to parse file',
        details: 'File must be valid JSON from Twitter data export'
      }, { status: 400 })
    }

    if (!Array.isArray(followersData) || followersData.length === 0) {
      return NextResponse.json({ 
        error: 'No followers found in file',
        details: 'The uploaded file does not contain valid followers data'
      }, { status: 400 })
    }

    console.log(`Processing ${followersData.length} followers from archive`)

    // Initialize Firebase
    const firebase = await getFirebaseAdmin()
    const db = firebase.firestore()
    
    // Process followers in batches (Firestore batch limit is 500)
    const batchSize = 450
    let processedCount = 0
    
    for (let i = 0; i < followersData.length; i += batchSize) {
      const batch = db.batch()
      const batchData = followersData.slice(i, i + batchSize)
      
      batchData.forEach((follower: any) => {
        // Handle different possible formats
        let followerInfo = {
          id: follower.id || follower.id_str || `archive_${processedCount}`,
          username: follower.screen_name || follower.username || 'unknown',
          name: follower.name || follower.display_name || follower.username || 'Unknown',
          profile_image_url: follower.profile_image_url || follower.profile_image_url_https || '',
          followers_count: follower.followers_count || 0,
          following_count: follower.friends_count || follower.following_count || 0,
          verified: follower.verified || false,
          source: 'twitter-archive',
          imported_at: new Date(),
          user_id: userId
        }
        
        const followerRef = db
          .collection('users')
          .doc(userId)
          .collection('followers')
          .doc(`archive_${followerInfo.id}`)
        
        batch.set(followerRef, followerInfo)
        processedCount++
      })
      
      await batch.commit()
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}, total: ${processedCount}`)
    }

    // Update user's last import timestamp
    await db.collection('users').doc(userId).update({
      last_archive_import: new Date(),
      archive_followers_count: processedCount
    })

    return NextResponse.json({
      success: true,
      followers_imported: processedCount,
      source: 'twitter-archive',
      message: `Successfully imported ${processedCount} followers from Twitter archive`
    })

  } catch (error) {
    console.error('Twitter archive import error:', error)
    return NextResponse.json({
      error: 'Import failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
