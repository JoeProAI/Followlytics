const https = require('https');

// Test if Twitter credentials are working in Vercel
async function testTwitterConfig() {
  console.log('🔍 Testing Twitter API configuration...');
  
  try {
    // Test Twitter API verification endpoint
    const response = await makeRequest('https://followlytics-zeta.vercel.app/api/twitter/verify');
    console.log('✅ Twitter API Config Result:', JSON.stringify(response, null, 2));
    
    if (response.success) {
      console.log('🎉 Twitter Consumer Key/Secret are working!');
      console.log('📋 Next step: Complete OAuth flow for user authentication');
    } else {
      console.log('❌ Twitter credentials issue:', response.error);
    }
    
  } catch (error) {
    console.log('⚠️ Twitter config test error:', error.message);
  }
  
  // Also test system health
  try {
    console.log('\n🏥 Checking system health...');
    const health = await makeRequest('https://followlytics-zeta.vercel.app/api/health');
    console.log('✅ System Health:', JSON.stringify(health, null, 2));
    
    if (health.environment?.hasTwitterConfig) {
      console.log('🎯 Twitter config detected in environment!');
    } else {
      console.log('⚠️ Twitter config not detected in health check');
    }
    
  } catch (error) {
    console.log('⚠️ Health check error:', error.message);
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
        'User-Agent': 'Twitter-Config-Test/1.0'
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

testTwitterConfig();
