// Check if user has valid OAuth tokens stored in Firebase
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'followlytics-app',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  };
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const adminDb = admin.firestore();

async function checkOAuthTokens() {
  try {
    console.log('🔍 Checking OAuth tokens in Firebase...');
    
    // Get all x_tokens documents
    const tokensSnapshot = await adminDb.collection('x_tokens').get();
    
    if (tokensSnapshot.empty) {
      console.log('❌ No OAuth tokens found in x_tokens collection');
      return;
    }
    
    console.log(`📊 Found ${tokensSnapshot.size} OAuth token records:`);
    
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n👤 User ID: ${doc.id}`);
      console.log(`  Screen Name: ${data.screenName || 'N/A'}`);
      console.log(`  Access Token: ${data.accessToken ? data.accessToken.substring(0, 10) + '...' : 'MISSING'}`);
      console.log(`  Access Token Secret: ${data.accessTokenSecret ? data.accessTokenSecret.substring(0, 10) + '...' : 'MISSING'}`);
      console.log(`  Created: ${data.createdAt ? data.createdAt.toDate() : 'N/A'}`);
      
      // Check if tokens are valid (not empty)
      const hasValidTokens = data.accessToken && data.accessTokenSecret && 
                           data.accessToken.length > 10 && data.accessTokenSecret.length > 10;
      console.log(`  Status: ${hasValidTokens ? '✅ Valid' : '❌ Invalid/Missing'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking OAuth tokens:', error.message);
  }
}

checkOAuthTokens();
