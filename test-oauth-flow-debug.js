const https = require('https');

// Test the OAuth flow and token storage
async function testOAuthFlow() {
  console.log('🧪 Testing OAuth Flow Debug...\n');
  
  // Test 1: Check if OAuth initialization works
  console.log('1️⃣ Testing OAuth initialization...');
  try {
    const options = {
      hostname: 'followlytics.vercel.app',
      path: '/api/auth/twitter',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const response = await makeRequest(options);
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.statusCode === 302) {
      console.log('   ✅ OAuth initialization working - redirects to Twitter');
      const location = response.headers.location;
      if (location && location.includes('api.twitter.com')) {
        console.log('   ✅ Redirect URL looks correct');
      } else {
        console.log('   ⚠️ Redirect URL might be incorrect:', location);
      }
    } else {
      console.log('   ❌ OAuth initialization failed');
      console.log('   Response:', response.data);
    }
  } catch (error) {
    console.log('   ❌ OAuth initialization error:', error.message);
  }

  console.log('\n2️⃣ Testing auth status endpoint...');
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
    console.log(`   Response:`, JSON.parse(response.data || '{}'));
  } catch (error) {
    console.log('   ❌ Auth status error:', error.message);
  }

  console.log('\n3️⃣ Checking Vercel deployment logs...');
  console.log('   💡 To see real-time logs, run: vercel logs --follow');
  console.log('   💡 Or check Vercel dashboard: https://vercel.com/dashboard');
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
testOAuthFlow().catch(console.error);
