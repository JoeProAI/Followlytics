#!/usr/bin/env node

/**
 * Test Twitter Authentication in Production Environment
 * Tests the actual production API endpoint
 */

const https = require('https');

async function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Followlytics-Auth-Test/1.0'
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testProductionAuth() {
  console.log('🌐 Testing Twitter Authentication in Production...\n');

  try {
    // Test the production Twitter login endpoint
    console.log('📤 Testing production Twitter login endpoint...');
    
    const response = await makeRequest('https://followlytics.vercel.app/api/auth/twitter/login');
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));

    if (response.status === 302 || response.status === 200) {
      console.log('✅ Production Twitter authentication endpoint is accessible');
      
      if (response.data && response.data.error) {
        console.log('❌ Authentication error in production:');
        console.log(`   Error: ${response.data.error}`);
        console.log(`   Details: ${response.data.details || 'No details'}`);
        
        if (response.data.debug) {
          console.log('   Debug info:', response.data.debug);
        }
        
        return false;
      }
      
      return true;
    } else {
      console.log('❌ Production endpoint returned unexpected status');
      return false;
    }

  } catch (error) {
    console.error('❌ Production test failed:', error.message);
    return false;
  }
}

// Run the test
testProductionAuth().then(success => {
  console.log('\n' + '='.repeat(50));
  console.log('🏁 PRODUCTION AUTH TEST COMPLETE');
  console.log('='.repeat(50));
  
  if (success) {
    console.log('✅ Production authentication is working');
  } else {
    console.log('❌ Production authentication has issues');
    console.log('🔧 Possible causes:');
    console.log('   • Environment variables not set in Vercel');
    console.log('   • Different credentials in production vs local');
    console.log('   • Vercel deployment issues');
  }
  
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});
