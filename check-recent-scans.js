// Check recent scan status from Firebase
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "followlytics-ai",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-kqgvr@followlytics-ai.iam.gserviceaccount.com",
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkRecentScans() {
  try {
    console.log('🔍 Checking recent follower scans...');
    
    // Get recent scans
    const scansSnapshot = await db.collection('follower_scans')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    console.log(`📊 Found ${scansSnapshot.docs.length} recent scans`);
    
    scansSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n📋 Scan ${index + 1}: ${doc.id}`);
      console.log(`  👤 User: ${data.userId}`);
      console.log(`  🐦 Username: ${data.xUsername}`);
      console.log(`  📊 Status: ${data.status}`);
      console.log(`  📅 Created: ${data.createdAt?.toDate?.()?.toISOString() || 'unknown'}`);
      console.log(`  📅 Completed: ${data.completedAt?.toDate?.()?.toISOString() || 'not completed'}`);
      console.log(`  👥 Followers: ${data.followerCount || 0}`);
      console.log(`  🏗️ Sandbox: ${data.sandboxId || 'none'}`);
      
      if (data.error) {
        console.log(`  ❌ Error: ${data.error}`);
      }
      
      if (data.progress) {
        console.log(`  📈 Progress: ${data.progress}%`);
      }
    });
    
    // Check for any active scans
    const activeScansSnapshot = await db.collection('follower_scans')
      .where('status', 'in', ['pending', 'initializing', 'setting_up', 'scanning'])
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    if (activeScansSnapshot.docs.length > 0) {
      console.log(`\n🔄 Found ${activeScansSnapshot.docs.length} active scans:`);
      activeScansSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        console.log(`  📋 ${doc.id}: ${data.status} (${data.xUsername})`);
        if (data.sandboxId) {
          console.log(`    🏗️ Sandbox: ${data.sandboxId}`);
        }
      });
    } else {
      console.log('\n✅ No active scans found');
    }
    
  } catch (error) {
    console.error('❌ Error checking scans:', error.message);
  }
}

checkRecentScans().catch(console.error);
