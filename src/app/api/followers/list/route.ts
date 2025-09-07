import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Initialize Firebase Admin SDK
let adminSDK: any = null

async function getFirebaseAdmin() {
  if (!adminSDK) {
    const admin = await import('firebase-admin')
    adminSDK = admin.default
  }
  
  try {
    if (adminSDK.apps.length === 0) {
      // Try using service account key first (if available)
      const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY
      
      if (serviceAccountKey) {
        try {
          const serviceAccount = JSON.parse(serviceAccountKey)
          adminSDK.initializeApp({
            credential: adminSDK.credential.cert(serviceAccount)
          })
        } catch (jsonError) {
          console.error('Failed to parse service account JSON:', jsonError)
        }
      }
      
      // Use individual environment variables (either as fallback or primary)
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
    }
  } catch (error) {
    console.error('Firebase initialization error:', error)
    throw error
  }
  
  return adminSDK
}

export async function GET(request: NextRequest) {
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

    // Get pagination parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const source = searchParams.get('source') // 'scrapfly', 'twitter', or 'all'
    
    // Initialize Firebase
    const admin = await getFirebaseAdmin()
    const db = admin.firestore()
    
    // Build query
    let query = db.collection('users').doc(userId).collection('followers')
    
    if (source && source !== 'all') {
      query = query.where('source', '==', source)
    }
    
    // Order by scan date (most recent first)
    query = query.orderBy('scanned_at', 'desc')
    
    // Apply pagination
    const offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    const snapshot = await query.get()
    
    const followers = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      scanned_at: doc.data().scanned_at?.toDate?.()?.toISOString() || null
    }))
    
    // Get total count for pagination
    const totalQuery = db.collection('users').doc(userId).collection('followers')
    const totalSnapshot = source && source !== 'all' 
      ? await totalQuery.where('source', '==', source).get()
      : await totalQuery.get()
    
    const totalCount = totalSnapshot.size
    const totalPages = Math.ceil(totalCount / limit)
    
    return NextResponse.json({
      followers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      source: source || 'all'
    })

  } catch (error) {
    console.error('Error fetching followers list:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
