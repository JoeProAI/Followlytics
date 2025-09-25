const https = require('https');

// Check what version is actually deployed
async function checkDeploymentVersion() {
  console.log('🔍 Checking actual deployment version...');
  
  try {
    // Check system status for uptime and version info
    const response = await makeRequest('https://followlytics-zeta.vercel.app/api/system/status');
    console.log('📊 System Status Response:');
    console.log(JSON.stringify(response, null, 2));
    
    // Check if we can see our comment in the optimized route
    console.log('\n🔍 Testing if latest code is deployed...');
    
    // Try to trigger an error that would show our latest code
    try {
      await makeRequest('https://followlytics-zeta.vercel.app/api/scan/optimized', 'POST', {});
    } catch (error) {
      console.log('📋 Error response (shows if latest code deployed):');
      console.log(error.message);
    }
    
    // Check health endpoint
    console.log('\n🏥 Health check:');
    const health = await makeRequest('https://followlytics-zeta.vercel.app/api/health');
    console.log(JSON.stringify(health, null, 2));
    
  } catch (error) {
    console.error('❌ Failed to check deployment:', error.message);
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
        'User-Agent': 'Deployment-Version-Check/1.0'
      },
      timeout: 10000
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
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data && method === 'POST') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

checkDeploymentVersion();
