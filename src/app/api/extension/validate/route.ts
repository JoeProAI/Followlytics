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

// Validate browser extension API key
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing or invalid authorization header' 
      }, { status: 401 })
    }

    const apiKey = authHeader.replace('Bearer ', '')
    
    // For now, use a simple API key validation
    // In production, you'd validate against your user database
    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid API key format' 
      }, { status: 401 })
    }

    // TODO: Validate API key against user database
    // For now, accept any properly formatted key
    const isValidKey = apiKey.startsWith('flw_') && apiKey.length >= 20

    if (!isValidKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid API key' 
      }, { status: 401 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'API key validated successfully',
      user_id: 'extension_user' // TODO: Get actual user ID from API key
    })

  } catch (error) {
    console.error('Extension validation error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
