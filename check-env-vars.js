const https = require('https');

// Check what environment variables are actually available
async function checkEnvVars() {
  console.log('🔍 Checking environment variables status...');
  
  try {
    // Check system status which shows environment variable status
    const response = await makeRequest('https://followlytics-zeta.vercel.app/api/system/status');
    console.log('📊 System Status:', JSON.stringify(response, null, 2));
    
    const envStatus = response.environment;
    
    console.log('\n📋 Environment Variable Status:');
    console.log(`✅ DAYTONA_API_KEY: ${envStatus.DAYTONA_API_KEY ? 'SET' : 'MISSING'}`);
    console.log(`✅ DAYTONA_API_URL: ${envStatus.DAYTONA_API_URL ? 'SET' : 'MISSING'}`);
    console.log(`✅ FIREBASE_PROJECT_ID: ${envStatus.FIREBASE_PROJECT_ID ? 'SET' : 'MISSING'}`);
    console.log(`✅ FIREBASE_CLIENT_EMAIL: ${envStatus.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING'}`);
    console.log(`✅ FIREBASE_PRIVATE_KEY: ${envStatus.FIREBASE_PRIVATE_KEY ? 'SET' : 'MISSING'}`);
    console.log(`❌ TWITTER_CONSUMER_KEY: ${envStatus.TWITTER_CONSUMER_KEY ? 'SET' : 'MISSING'}`);
    console.log(`❌ TWITTER_CONSUMER_SECRET: ${envStatus.TWITTER_CONSUMER_SECRET ? 'SET' : 'MISSING'}`);
    
    if (!envStatus.TWITTER_CONSUMER_KEY || !envStatus.TWITTER_CONSUMER_SECRET) {
      console.log('\n🚨 ISSUE IDENTIFIED:');
      console.log('Twitter Consumer Key/Secret are not being detected by the application.');
      console.log('\n🔧 POSSIBLE SOLUTIONS:');
      console.log('1. Check Vercel Dashboard → Followlytics → Settings → Environment Variables');
      console.log('2. Ensure variable names are exactly: TWITTER_CONSUMER_KEY and TWITTER_CONSUMER_SECRET');
      console.log('3. Redeploy the application after adding environment variables');
      console.log('4. Check if variables are set for Production environment');
    } else {
      console.log('\n✅ Twitter credentials are properly configured!');
    }
    
  } catch (error) {
    console.log('❌ Error checking environment variables:', error.message);
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
        'User-Agent': 'Env-Vars-Check/1.0'
      }
    };
    
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
    
    req.end();
  });
}

checkEnvVars();
