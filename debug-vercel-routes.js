const https = require('https');

// Debug which routes are actually available on Vercel
async function debugVercelRoutes() {
  console.log('🔍 Debugging Vercel route availability...');
  
  const testRoutes = [
    '/api/health',
    '/api/system/status', 
    '/api/scan/monitor',
    '/api/scan/optimized',
    '/api/scan/followers',
    '/api/scan/simple',
    '/api/twitter/verify'
  ];
  
  for (const route of testRoutes) {
    try {
      console.log(`\n🧪 Testing: ${route}`);
      const response = await makeRequest(`https://followlytics-zeta.vercel.app${route}`);
      console.log(`✅ ${route}: 200 OK`);
      
      if (route === '/api/scan/optimized') {
        console.log('🎉 OPTIMIZED ROUTE IS WORKING!');
      }
      
    } catch (error) {
      const statusCode = error.message.match(/HTTP (\d+)/)?.[1] || 'unknown';
      
      if (statusCode === '404') {
        console.log(`❌ ${route}: 404 NOT FOUND`);
        
        if (route === '/api/scan/optimized') {
          console.log('🚨 OPTIMIZED ROUTE MISSING - This is the problem!');
        }
      } else if (statusCode === '401') {
        console.log(`🔒 ${route}: 401 UNAUTHORIZED (route exists, needs auth)`);
      } else if (statusCode === '400') {
        console.log(`⚠️ ${route}: 400 BAD REQUEST (route exists, needs params)`);
      } else {
        console.log(`⚠️ ${route}: ${statusCode} - ${error.message}`);
      }
    }
  }
  
  console.log('\n📊 DIAGNOSIS:');
  console.log('If /api/scan/optimized shows 404, the file is not deployed properly');
  console.log('If other /api/scan/* routes work but optimized doesn\'t, there\'s a specific issue with that file');
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
        'User-Agent': 'Route-Debug/1.0'
      },
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
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
    
    req.end();
  });
}

debugVercelRoutes();
