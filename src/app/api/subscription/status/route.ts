import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Initialize Firebase Admin dynamically
async function initializeFirebaseAdmin() {
  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    
    if (getApps().length === 0) {
      // Try using service account key first (if available)
      const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY
      
      if (serviceAccountKey) {
        try {
          const serviceAccount = JSON.parse(serviceAccountKey)
          initializeApp({
            credential: cert(serviceAccount)
          })
        } catch (jsonError) {
          console.error('Failed to parse service account JSON:', jsonError)
          throw new Error('Invalid Firebase service account JSON format')
        }
      } else {
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
          
          // Validate PEM format
          if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
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
    
    return getFirestore()
  } catch (error) {
    console.error('Firebase Admin initialization error:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user from Firebase token
    const cookieStore = cookies()
    const token = cookieStore.get('firebase_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Decode token to get user ID
    let userId: string
    try {
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) throw new Error('Invalid token format')
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      userId = payload.uid
      if (!userId) throw new Error('No user ID in token')
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const db = await initializeFirebaseAdmin()
    
    // Get user subscription data
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userData = userDoc.data()!
    const subscription = userData.subscription || {
      tier: 'starter',
      status: 'inactive'
    }
    
    // Get current usage
    const today = new Date().toISOString().split('T')[0]
    const usageDoc = await db.collection('usage').doc(`${userId}_${today}`).get()
    const usageData = usageDoc.exists ? usageDoc.data() : { calls: 0 }
    
    const tierLimits = {
      starter: 10000,
      professional: 100000,
      business: 500000,
      enterprise: 999999999
    }
    
    const limit = tierLimits[subscription.tier as keyof typeof tierLimits] || 10000
    
    return NextResponse.json({
      tier: subscription.tier,
      status: subscription.status || 'inactive',
      currentPeriodEnd: subscription.currentPeriodEnd,
      usage: {
        apiCalls: usageData?.calls || 0,
        limit: limit,
        resetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()
      }
    })
    
  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription status' }, 
      { status: 500 }
    )
  }
}
