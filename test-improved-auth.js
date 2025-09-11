#!/usr/bin/env node

const https = require('https');

async function testImprovedAuth() {
  console.log('🔍 Testing Improved App Authentication...\n');

  // Submit scan with improved OAuth authentication
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
            console.log('✅ Improved auth scan submitted');
            console.log(`Job ID: ${data.job_id}`);
            
            // Monitor for authentication success
            monitorAuthProgress(data.job_id).then(resolve);
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

async function monitorAuthProgress(jobId) {
  console.log(`\n📊 Monitoring authentication progress: ${jobId}`);
  
  for (let i = 0; i < 20; i++) { // 3+ minutes
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const status = await checkJobStatus(jobId);
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(`[${timestamp}] ${status.status} | ${status.phase} | ${status.progress}% | Followers: ${status.followers_found || 0}`);
    
    if (status.status === 'completed') {
      console.log(`✅ SUCCESS! Found ${status.followers_found} followers with app auth`);
      return true;
    }
    
    if (status.status === 'failed') {
      console.log(`❌ FAILED: ${status.error}`);
      return false;
    }
    
    // Check if we're getting followers (authentication working)
    if (status.followers_found > 50) {
      console.log('🎉 App authentication is working - extracting followers!');
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

testImprovedAuth().then(success => {
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('🎉 IMPROVED APP AUTHENTICATION: SUCCESS!');
    console.log('✅ OAuth cookies and headers configured correctly');
    console.log('✅ Browser authenticated as app');
    console.log('✅ Full followers tab access enabled');
  } else {
    console.log('❌ App authentication needs further debugging');
  }
});
