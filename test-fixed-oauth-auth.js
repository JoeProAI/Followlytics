#!/usr/bin/env node

const https = require('https');

async function testFixedOAuth() {
  console.log('🔍 Testing Fixed OAuth Browser Authentication...\n');

  // Submit scan with fixed OAuth authentication
  const scanData = JSON.stringify({
    username: 'JoeProAI',
    estimated_followers: 868
  });

  const options = {
    hostname: 'followlytics.vercel.app',
    port: 443,
    path: '/api/scan/daytona',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': scanData.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
          const data = JSON.parse(body);
          console.log('Response:', JSON.stringify(data, null, 2));
          
          if (data.success && data.job_id) {
            console.log('✅ Fixed OAuth scan submitted');
            console.log(`Job ID: ${data.job_id}`);
            
            // Monitor for successful authentication and follower access
            monitorOAuthAccess(data.job_id).then(resolve);
          } else {
            resolve(false);
          }
        } catch (e) {
          console.log('Raw response:', body);
          resolve(false);
        }
      });
    });

    req.on('error', reject);
    req.write(scanData);
    req.end();
  });
}

async function monitorOAuthAccess(jobId) {
  console.log(`\n📊 Monitoring OAuth authentication and follower access: ${jobId}`);
  
  for (let i = 0; i < 25; i++) { // 4+ minutes
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const status = await checkJobStatus(jobId);
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(`[${timestamp}] ${status.status} | ${status.phase} | ${status.progress}% | Followers: ${status.followers_found || 0}`);
    
    if (status.status === 'completed') {
      console.log(`✅ SUCCESS! Found ${status.followers_found} followers with proper OAuth auth`);
      return status.followers_found > 100; // Success if we got substantial followers
    }
    
    if (status.status === 'failed') {
      console.log(`❌ FAILED: ${status.error}`);
      return false;
    }
    
    // Check if we're getting substantial followers (authentication working)
    if (status.followers_found > 100) {
      console.log('🎉 OAuth authentication working - accessing followers page successfully!');
      return true;
    }
  }
  
  console.log('⏰ Monitoring complete');
  return false;
}

async function checkJobStatus(jobId) {
  return new Promise((resolve) => {
    const req = https.request(`https://followlytics.vercel.app/api/scan/daytona?job_id=${jobId}`, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ status: 'error', error: 'Parse error' });
        }
      });
    });
    req.on('error', () => resolve({ status: 'error' }));
    req.end();
  });
}

testFixedOAuth().then(success => {
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('🎉 OAUTH BROWSER AUTHENTICATION: SUCCESS!');
    console.log('✅ OAuth tokens properly authenticate browser session');
    console.log('✅ Can access followers page without redirect to home');
    console.log('✅ Extracting substantial follower data');
  } else {
    console.log('❌ OAuth browser authentication needs more work');
  }
});
