const https = require('https');

// Test if the new methods are deployed
async function testDeploymentStatus() {
  console.log('🔍 Testing if new methods are deployed...');
  
  try {
    // Try to trigger a scan to see if we get the old error or new behavior
    const testScanData = {
      username: 'testuser',
      scanType: 'small',
      maxFollowers: 10
    };
    
    const response = await makeRequest('https://followlytics-zeta.vercel.app/api/scan/optimized', 'POST', testScanData);
    console.log('✅ Scan response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.log('⚠️ Scan error (expected):', error.message);
    
    // Check what type of error we get
    if (error.message.includes('setupOptimizedEnvironment is not a function')) {
      console.log('❌ OLD CODE STILL DEPLOYED - setupOptimizedEnvironment missing');
      console.log('🔄 Need to wait for deployment or force redeploy');
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('✅ NEW CODE DEPLOYED - Getting auth error (expected)');
      console.log('🎯 Methods are available, just need proper authentication');
    } else if (error.message.includes('executeOptimizedScan is not a function')) {
      console.log('❌ PARTIAL DEPLOYMENT - setupOptimizedEnvironment exists but executeOptimizedScan missing');
    } else {
      console.log('🤔 Different error - analyzing...');
    }
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
        'User-Agent': 'Deployment-Test/1.0'
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

testDeploymentStatus();
