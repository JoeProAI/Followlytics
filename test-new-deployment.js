const https = require('https');

// Test if new deployment is live
async function testNewDeployment() {
  console.log('🧪 Testing if new deployment is live...');
  
  try {
    const response = await makeRequest('https://followlytics-zeta.vercel.app/api/health');
    console.log('📊 Health Response:');
    console.log(JSON.stringify(response, null, 2));
    
    if (response.deploymentForced === '2025-09-24T22:33:33') {
      console.log('\n🎉 SUCCESS! New deployment is LIVE!');
      console.log('✅ The forced deployment timestamp is present');
      console.log('✅ Latest code is now deployed');
      console.log('✅ Ready to test Twitter extraction!');
    } else {
      console.log('\n⚠️ Old deployment still active');
      console.log('❌ deploymentForced timestamp not found');
      console.log('❌ Need to manually redeploy in Vercel dashboard');
    }
    
  } catch (error) {
    console.error('❌ Failed to test deployment:', error.message);
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Deployment-Test/1.0'
      },
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (parseError) {
          resolve(responseData);
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

testNewDeployment();
