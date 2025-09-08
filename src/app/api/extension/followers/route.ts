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

export async function GET(request: NextRequest) {
  try {
    const admin = await getFirebaseAdmin()
    const db = admin.firestore()
    
    // Get user ID from session/auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }
    
    // Extract API key from Bearer token
    const apiKey = authHeader.replace('Bearer ', '')
    
    // Find user by API key
    const apiKeysRef = db.collection('api_keys')
    const apiKeyQuery = await apiKeysRef.where('key', '==', apiKey).limit(1).get()
    
    if (apiKeyQuery.empty) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }
    
    const apiKeyDoc = apiKeyQuery.docs[0]
    const userId = apiKeyDoc.data().user_id
    
    if (!userId) {
      return NextResponse.json({ error: 'No user ID found for API key' }, { status: 401 })
    }
    
    // Get all followers for this user
    const followersRef = db.collection('users').doc(userId).collection('followers')
    const followersSnapshot = await followersRef.orderBy('scraped_at', 'desc').get()
    
    const followers: any[] = []
    followersSnapshot.forEach((doc: any) => {
      followers.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    // Get scan metadata
    const scansRef = db.collection('users').doc(userId).collection('scans')
    const scansSnapshot = await scansRef.orderBy('scan_date', 'desc').limit(1).get()
    
    let scanMetadata = null
    if (!scansSnapshot.empty) {
      scanMetadata = scansSnapshot.docs[0].data()
    }
    
    return NextResponse.json({
      success: true,
      followers: followers,
      total_followers: followers.length,
      scan_metadata: scanMetadata
    })
    
  } catch (error) {
    console.error('Error fetching followers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch followers' },
      { status: 500 }
    )
  }
}

// Support session-based auth for dashboard
export async function POST(request: NextRequest) {
  try {
    const admin = await getFirebaseAdmin()
    const db = admin.firestore()
    
    // Get the request body to check for user info
    const body = await request.json().catch(() => ({}))
    
    // Try to get user from Firebase Auth token in cookies
    const cookies = request.headers.get('cookie') || ''
    const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='))
    
    if (sessionCookie) {
      try {
        const sessionToken = sessionCookie.split('=')[1]
        const decodedToken = await admin.auth().verifySessionCookie(sessionToken)
        const userId = decodedToken.uid
        
        // Get followers for this user
        const followersRef = db.collection('users').doc(userId).collection('followers')
        const followersSnapshot = await followersRef.orderBy('scraped_at', 'desc').get()
        
        const followers: any[] = []
        followersSnapshot.forEach((doc: any) => {
          followers.push({
            id: doc.id,
            ...doc.data()
          })
        })
        
        return NextResponse.json({
          success: true,
          followers: followers,
          total_followers: followers.length
        })
        
      } catch (authError) {
        console.error('Auth error:', authError)
      }
    }
    
    // Return empty if no auth
    return NextResponse.json({
      success: true,
      followers: [],
      total_followers: 0,
      message: 'No followers found - use extension to scan'
    })
    
  } catch (error) {
    console.error('Error in POST followers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch followers' },
      { status: 500 }
    )
  }
}
