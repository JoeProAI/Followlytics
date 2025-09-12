const https = require('https');

// Test Firebase configuration and connection
async function testFirebaseConfig() {
  console.log('🔥 Testing Firebase Configuration...\n');
  
  // Check environment variables
  console.log('1️⃣ Checking Firebase Environment Variables:');
  
  const requiredEnvs = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL', 
    'FIREBASE_PRIVATE_KEY'
  ];
  
  const publicEnvs = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ];
  
  console.log('\n📋 Server-side Firebase Admin SDK vars:');
  requiredEnvs.forEach(env => {
    const value = process.env[env];
    if (value) {
      if (env === 'FIREBASE_PRIVATE_KEY') {
        console.log(`   ✅ ${env}: ${value.length} chars, starts with: ${value.substring(0, 30)}...`);
        
        // Check private key format
        const hasBegin = value.includes('-----BEGIN PRIVATE KEY-----') || value.includes('-----BEGIN RSA PRIVATE KEY-----');
        const hasEnd = value.includes('-----END PRIVATE KEY-----') || value.includes('-----END RSA PRIVATE KEY-----');
        console.log(`      🔑 PEM format check - Begin: ${hasBegin}, End: ${hasEnd}`);
        
        // Check for escaped newlines
        const hasEscapedNewlines = value.includes('\\n');
        console.log(`      📝 Has escaped newlines: ${hasEscapedNewlines}`);
        
      } else if (env === 'FIREBASE_CLIENT_EMAIL') {
        console.log(`   ✅ ${env}: ${value}`);
      } else {
        console.log(`   ✅ ${env}: ${value}`);
      }
    } else {
      console.log(`   ❌ ${env}: NOT SET`);
    }
  });
  
  console.log('\n📋 Client-side Firebase config vars:');
  publicEnvs.forEach(env => {
    const value = process.env[env];
    console.log(`   ${value ? '✅' : '❌'} ${env}: ${value || 'NOT SET'}`);
  });
  
  // Test Firebase Admin initialization
  console.log('\n2️⃣ Testing Firebase Admin SDK Initialization:');
  try {
    // Test the auth status endpoint which uses Firebase Admin
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
      console.log('   ✅ Firebase Admin SDK working - auth status endpoint responding');
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    } else if (response.statusCode === 500) {
      console.log('   ❌ Firebase Admin SDK error - 500 status');
      console.log(`   Error response: ${response.data}`);
    } else {
      console.log(`   ⚠️ Unexpected status: ${response.statusCode}`);
      console.log(`   Response: ${response.data}`);
    }
  } catch (error) {
    console.log('   ❌ Firebase test failed:', error.message);
  }
  
  // Test Firestore write operation
  console.log('\n3️⃣ Testing Firestore Write Operation:');
  try {
    const testData = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test: 'firebase_config_test',
        timestamp: new Date().toISOString()
      })
    };
    
    console.log('   💡 To test Firestore writes, we need to trigger OAuth callback');
    console.log('   💡 Or create a dedicated test endpoint');
    console.log('   💡 Current test focuses on Firebase Admin SDK initialization');
    
  } catch (error) {
    console.log('   ❌ Firestore test setup failed:', error.message);
  }
  
  console.log('\n4️⃣ Recommendations:');
  
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!projectId) {
    console.log('   🔧 Set FIREBASE_PROJECT_ID=followlytics-cd4e1');
  }
  
  if (!clientEmail) {
    console.log('   🔧 Set FIREBASE_CLIENT_EMAIL to your service account email');
    console.log('      Format: firebase-adminsdk-xxxxx@followlytics-cd4e1.iam.gserviceaccount.com');
  }
  
  if (!privateKey) {
    console.log('   🔧 Set FIREBASE_PRIVATE_KEY to your service account private key');
    console.log('      Ensure it includes -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----');
  } else {
    const hasBegin = privateKey.includes('-----BEGIN PRIVATE KEY-----');
    const hasEnd = privateKey.includes('-----END PRIVATE KEY-----');
    if (!hasBegin || !hasEnd) {
      console.log('   🔧 Fix FIREBASE_PRIVATE_KEY format - ensure PEM boundaries are present');
    }
  }
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
testFirebaseConfig().catch(console.error);
