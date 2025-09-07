import { NextRequest, NextResponse } from 'next/server'

let adminSDK: any = null

async function getFirebaseAdmin() {
  if (!adminSDK) {
    const admin = await import('firebase-admin')
    adminSDK = admin.default
  }
  
  try {
    if (adminSDK.apps.length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      let privateKey = process.env.FIREBASE_PRIVATE_KEY
      if (privateKey) {
        privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
      }
      
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(`Missing Firebase config: projectId=${!!projectId}, clientEmail=${!!clientEmail}, privateKey=${!!privateKey}`)
      }
      
      adminSDK.initializeApp({
        credential: adminSDK.credential.cert({
          project_id: projectId,
          client_email: clientEmail,
          private_key: privateKey
        })
      })
    }
  } catch (error) {
    console.error('Firebase initialization error:', error)
    throw error
  }
  
  return adminSDK
}

// Download and process Octoparse results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const task_id = searchParams.get('task_id')
    const api_key = searchParams.get('api_key')
    const user_id = searchParams.get('user_id')

    if (!task_id || !api_key || !user_id) {
      return NextResponse.json({ 
        error: 'Task ID, API key, and user ID required' 
      }, { status: 400 })
    }

    // Download data from Octoparse
    const downloadResponse = await fetch(`https://dataapi.octoparse.com/api/data/export?taskId=${task_id}&format=json`, {
      headers: {
        'Authorization': `Bearer ${api_key}`
      }
    })

    if (!downloadResponse.ok) {
      throw new Error(`Download failed: ${downloadResponse.status}`)
    }

    const rawData = await downloadResponse.json()
    
    // Process and clean the follower data
    const followers = processOctoparseData(rawData)
    
    if (followers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No followers found in Octoparse results',
        message: 'This could indicate Twitter blocked the scraping or the target account has no followers'
      })
    }

    // Store in Firestore
    const admin = await getFirebaseAdmin()
    const db = admin.firestore()
    
    // Batch write followers to Firestore
    const batch = db.batch()
    const followersRef = db.collection('users').doc(user_id).collection('followers')
    
    followers.forEach((follower: any) => {
      const docRef = followersRef.doc(follower.username)
      batch.set(docRef, {
        ...follower,
        source: 'octoparse',
        scraped_at: admin.firestore.FieldValue.serverTimestamp(),
        task_id
      }, { merge: true })
    })
    
    await batch.commit()

    return NextResponse.json({
      success: true,
      followers_imported: followers.length,
      message: `Successfully imported ${followers.length} followers from Octoparse`,
      task_id,
      source: 'octoparse_scraping',
      data_quality: analyzeDataQuality(followers)
    })

  } catch (error) {
    console.error('Octoparse download error:', error)
    return NextResponse.json({ 
      error: 'Failed to download and process results',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function processOctoparseData(rawData: any): any[] {
  const followers: any[] = []
  
  try {
    // Handle different Octoparse data formats
    const dataArray = Array.isArray(rawData) ? rawData : rawData.data || rawData.results || []
    
    dataArray.forEach((item: any) => {
      // Extract username from various possible fields
      let username = item.username || item.handle || item.screen_name
      
      // Clean username (remove @ symbol if present)
      if (username && typeof username === 'string') {
        username = username.replace(/^@/, '').trim()
        
        // Validate username format
        if (username.match(/^[a-zA-Z0-9_]{1,15}$/)) {
          followers.push({
            username,
            display_name: item.display_name || item.name || username,
            profile_url: item.profile_url || `https://x.com/${username}`,
            follower_count: item.follower_count || null,
            following_count: item.following_count || null,
            bio: item.bio || item.description || null,
            verified: item.verified || false,
            profile_image: item.profile_image || item.avatar || null
          })
        }
      }
    })
    
  } catch (error) {
    console.error('Data processing error:', error)
  }
  
  return followers
}

function analyzeDataQuality(followers: any[]): any {
  const total = followers.length
  const withDisplayNames = followers.filter(f => f.display_name && f.display_name !== f.username).length
  const withBios = followers.filter(f => f.bio).length
  const verified = followers.filter(f => f.verified).length
  
  return {
    total_followers: total,
    data_completeness: {
      display_names: `${Math.round((withDisplayNames / total) * 100)}%`,
      bios: `${Math.round((withBios / total) * 100)}%`,
      verified_accounts: verified
    },
    quality_score: Math.round(((withDisplayNames + withBios) / (total * 2)) * 100)
  }
}
