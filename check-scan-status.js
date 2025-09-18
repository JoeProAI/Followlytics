// Debug script to check current scan status
const admin = require('firebase-admin')

// Initialize Firebase Admin (you'll need to set environment variables)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  })
}

const db = admin.firestore()

async function checkRecentScans() {
  console.log('🔍 Checking recent follower scans...')
  
  try {
    // Get recent scans from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const scansSnapshot = await db
      .collection('follower_scans')
      .where('createdAt', '>=', oneHourAgo)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()

    if (scansSnapshot.empty) {
      console.log('📭 No recent scans found')
      return
    }

    console.log(`📊 Found ${scansSnapshot.docs.length} recent scans:`)
    
    scansSnapshot.docs.forEach((doc, index) => {
      const data = doc.data()
      console.log(`\n${index + 1}. Scan ID: ${doc.id}`)
      console.log(`   Status: ${data.status}`)
      console.log(`   Username: ${data.xUsername}`)
      console.log(`   Method: ${data.method || 'unknown'}`)
      console.log(`   Created: ${data.createdAt?.toDate?.()?.toISOString() || data.createdAt}`)
      console.log(`   Completed: ${data.completedAt?.toDate?.()?.toISOString() || 'Not completed'}`)
      console.log(`   Followers: ${data.followerCount || 0}`)
      
      if (data.error) {
        console.log(`   Error: ${data.error}`)
      }
      
      if (data.requiresSessionCookies) {
        console.log(`   🍪 Requires session cookies: ${data.authenticationMessage || 'Yes'}`)
      }
    })

  } catch (error) {
    console.error('❌ Error checking scans:', error.message)
  }
}

// Run the check
checkRecentScans().then(() => {
  console.log('\n✅ Scan status check complete')
  process.exit(0)
}).catch(error => {
  console.error('💥 Script failed:', error)
  process.exit(1)
})
