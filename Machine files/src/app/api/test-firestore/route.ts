import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_SDK_KEY?.replace(/\\n/g, '\n')
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const projectId = 'followlytics-cd4e1'
  
  if (!privateKey || !clientEmail) {
    throw new Error('Firebase Admin SDK credentials not configured')
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: privateKey,
    }),
  })
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Firestore connection...')
    
    const db = admin.firestore()
    
    // Test 1: Try to create a test document
    console.log('📝 Creating test document...')
    const testDocRef = db.collection('test').doc('connection-test')
    await testDocRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'Firestore connection test successful'
    })
    
    console.log('✅ Test document created successfully')
    
    // Test 2: Try to read the test document
    console.log('📖 Reading test document...')
    const testDoc = await testDocRef.get()
    
    if (testDoc.exists) {
      console.log('✅ Test document read successfully:', testDoc.data())
    } else {
      console.log('❌ Test document not found after creation')
    }
    
    // Test 3: Check if users collection exists
    console.log('👥 Checking users collection...')
    const usersCollection = await db.collection('users').limit(1).get()
    console.log('📊 Users collection size:', usersCollection.size)
    
    // Clean up test document
    await testDocRef.delete()
    console.log('🧹 Test document cleaned up')
    
    return NextResponse.json({
      success: true,
      message: 'Firestore connection successful',
      usersCount: usersCollection.size,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('💥 Firestore test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
