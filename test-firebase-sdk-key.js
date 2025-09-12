const https = require('https');

// Test Firebase SDK Key configuration
async function testFirebaseSDKKey() {
  console.log('🔥 Testing FIREBASE_SDK_KEY Configuration...\n');
  
  // Check if FIREBASE_SDK_KEY is set
  console.log('1️⃣ Checking FIREBASE_SDK_KEY Environment Variable:');
  
  const firebaseSDKKey = process.env.FIREBASE_SDK_KEY;
  
  if (firebaseSDKKey) {
    console.log(`   ✅ FIREBASE_SDK_KEY: Set (${firebaseSDKKey.length} characters)`);
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(firebaseSDKKey);
      console.log('   ✅ JSON parsing: Success');
      console.log(`   📋 Project ID: ${parsed.project_id || 'NOT FOUND'}`);
      console.log(`   📋 Client Email: ${parsed.client_email || 'NOT FOUND'}`);
      console.log(`   📋 Private Key: ${parsed.private_key ? 'Present' : 'NOT FOUND'}`);
      
      if (parsed.private_key) {
        const hasBegin = parsed.private_key.includes('-----BEGIN PRIVATE KEY-----');
        const hasEnd = parsed.private_key.includes('-----END PRIVATE KEY-----');
        console.log(`   🔑 Private Key Format: Begin=${hasBegin}, End=${hasEnd}`);
      }
      
    } catch (error) {
      console.log('   ❌ JSON parsing: Failed');
      console.log(`   Error: ${error.message}`);
      console.log(`   Key preview: ${firebaseSDKKey.substring(0, 100)}...`);
    }
  } else {
    console.log('   ❌ FIREBASE_SDK_KEY: NOT SET');
  }
  
  // Test Firebase Admin SDK initialization via API
  console.log('\n2️⃣ Testing Firebase Admin SDK via API:');
  try {
    const options = {
      hostname: 'followlytics.vercel.app',
      path: '/api/auth/twitter/status',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const response = await makeRequest(options);
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data || '{}');
      console.log('   ✅ Firebase Admin SDK: Working');
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    } else if (response.statusCode === 500) {
      console.log('   ❌ Firebase Admin SDK: Error');
      console.log(`   Error response: ${response.data}`);
    } else {
      console.log(`   ⚠️ Unexpected status: ${response.statusCode}`);
    }
  } catch (error) {
    console.log('   ❌ API test failed:', error.message);
  }
  
  // Test OAuth callback (which writes to Firestore)
  console.log('\n3️⃣ Testing OAuth Callback Firestore Write:');
  console.log('   💡 To test Firestore writes, complete OAuth flow:');
  console.log('   1. Go to https://followlytics.vercel.app/dashboard');
  console.log('   2. Click "Authorize X Access"');
  console.log('   3. Complete OAuth in popup');
  console.log('   4. Check Firestore console for user document');
  console.log('   5. Try scanning - should now work with stored tokens');
  
  console.log('\n4️⃣ Expected Firestore Document Structure:');
  console.log('   Collection: users');
  console.log('   Document ID: {twitter_user_id}');
  console.log('   Fields:');
  console.log('     - twitter_id: string');
  console.log('     - username: string');
  console.log('     - access_token: string ← REQUIRED FOR SCANNING');
  console.log('     - access_token_secret: string ← REQUIRED FOR SCANNING');
  console.log('     - created_at: timestamp');
  console.log('     - last_login: timestamp');
}

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Run the test
testFirebaseSDKKey().catch(console.error);
