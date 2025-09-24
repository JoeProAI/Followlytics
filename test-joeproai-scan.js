const https = require('https');

// Test the JoeProAI scan functionality
async function testJoeProAIScan() {
  console.log('🧪 Testing Followlytics scan for @JoeProAI...');
  
  try {
    // First, check system status
    console.log('📊 Checking system status...');
    const statusResponse = await makeRequest('https://followlytics-zeta.vercel.app/api/system/status');
    console.log('✅ System Status:', JSON.stringify(statusResponse, null, 2));
    
    // Check if we can access the optimized scan endpoint
    console.log('\n🚀 Testing optimized scan endpoint...');
    
    // Note: This will fail without proper authentication, but we can see the error response
    const scanData = {
      username: 'JoeProAI',
      scanType: 'small',
      maxFollowers: 1000,
      timeoutDisabled: true,
      useSnapshot: false
    };
    
    try {
      const scanResponse = await makeRequest('https://followlytics-zeta.vercel.app/api/scan/optimized', 'POST', scanData);
      console.log('✅ Scan Response:', JSON.stringify(scanResponse, null, 2));
    } catch (scanError) {
      console.log('⚠️ Expected auth error (need Firebase token):', scanError.message);
      
      // Check if it's just an auth error (which is expected)
      if (scanError.message.includes('401') || scanError.message.includes('Unauthorized')) {
        console.log('✅ Scan endpoint is working (just needs authentication)');
      }
    }
    
    // Test the Daytona configuration
    console.log('\n🔧 Testing Daytona configuration...');
    
    // Check if we can access a simple endpoint that doesn't require auth
    try {
      const healthResponse = await makeRequest('https://followlytics-zeta.vercel.app/api/health');
      console.log('✅ Health Check:', JSON.stringify(healthResponse, null, 2));
    } catch (healthError) {
      console.log('⚠️ Health endpoint error:', healthError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Followlytics-Test/1.0'
      }
    };
    
    if (data && method === 'POST') {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (parseError) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data && method === 'POST') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run the test
testJoeProAIScan().then(() => {
  console.log('\n🎯 Test completed!');
}).catch((error) => {
  console.error('\n❌ Test failed:', error);
});
