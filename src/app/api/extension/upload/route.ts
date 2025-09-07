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

// Upload followers from browser extension
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing authorization header' 
      }, { status: 401 })
    }

    const apiKey = authHeader.replace('Bearer ', '')
    const { username, followers, scan_metadata } = await request.json()

    if (!username || !followers || !Array.isArray(followers)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: username, followers' 
      }, { status: 400 })
    }

    // Get Firebase Admin
    const admin = await getFirebaseAdmin()
    const db = admin.firestore()

    // TODO: Get actual user ID from API key validation
    const userId = 'extension_user'
    
    // Batch write followers to Firestore
    const batch = db.batch()
    const followersRef = db.collection('users').doc(userId).collection('followers')
    
    let importedCount = 0
    
    followers.forEach((follower: any) => {
      if (follower.username && typeof follower.username === 'string') {
        const docRef = followersRef.doc(follower.username)
        batch.set(docRef, {
          ...follower,
          target_username: username,
          imported_at: admin.firestore.FieldValue.serverTimestamp(),
          source: 'browser_extension'
        }, { merge: true })
        importedCount++
      }
    })

    // Save scan metadata
    if (scan_metadata) {
      const scanRef = db.collection('users').doc(userId).collection('scans').doc()
      batch.set(scanRef, {
        ...scan_metadata,
        target_username: username,
        followers_imported: importedCount,
        scan_completed_at: admin.firestore.FieldValue.serverTimestamp(),
        source: 'browser_extension'
      })
    }

    await batch.commit()

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedCount} followers`,
      followers_imported: importedCount,
      target_username: username,
      scan_id: scan_metadata ? 'generated' : null
    })

  } catch (error) {
    console.error('Extension upload error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
