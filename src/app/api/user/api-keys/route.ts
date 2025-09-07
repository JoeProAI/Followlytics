import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

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

// Generate new API key
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ 
        error: 'API key name is required' 
      }, { status: 400 })
    }

    // Generate secure API key
    const keyBytes = randomBytes(24)
    const apiKey = `flw_${keyBytes.toString('hex')}`
    
    const admin = await getFirebaseAdmin()
    const db = admin.firestore()
    
    // TODO: Get actual user ID from authentication
    const userId = 'current_user'
    
    const apiKeyData = {
      id: randomBytes(8).toString('hex'),
      name: name.trim(),
      key: apiKey,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      usage_count: 0,
      last_used: null,
      active: true
    }
    
    // Save to Firestore
    await db.collection('users').doc(userId).collection('api_keys').doc(apiKeyData.id).set(apiKeyData)
    
    return NextResponse.json({
      success: true,
      api_key: {
        ...apiKeyData,
        created_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('API key generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get user's API keys
export async function GET(request: NextRequest) {
  try {
    const admin = await getFirebaseAdmin()
    const db = admin.firestore()
    
    // TODO: Get actual user ID from authentication
    const userId = 'current_user'
    
    const snapshot = await db.collection('users').doc(userId).collection('api_keys')
      .where('active', '==', true)
      .orderBy('created_at', 'desc')
      .get()
    
    const apiKeys = snapshot.docs.map((doc: any) => ({
      ...doc.data(),
      created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString()
    }))
    
    return NextResponse.json({
      success: true,
      api_keys: apiKeys
    })

  } catch (error) {
    console.error('API keys fetch error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch API keys',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
