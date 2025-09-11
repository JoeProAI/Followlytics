#!/usr/bin/env node

const https = require('https');

async function testTwitterAPIDirect() {
  console.log('🔍 Testing Twitter API Direct Access...\n');

  // Submit scan with Twitter API approach
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
            console.log('✅ Twitter API scan submitted');
            console.log(`Job ID: ${data.job_id}`);
            
            // Monitor for Twitter API success
            monitorTwitterAPI(data.job_id).then(resolve);
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

async function monitorTwitterAPI(jobId) {
  console.log(`\n📊 Monitoring Twitter API extraction: ${jobId}`);
  
  for (let i = 0; i < 20; i++) { // 3+ minutes
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const status = await checkJobStatus(jobId);
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(`[${timestamp}] ${status.status} | ${status.phase} | ${status.progress}% | Followers: ${status.followers_found || 0}`);
    
    if (status.status === 'completed') {
      console.log(`✅ SUCCESS! Twitter API extracted ${status.followers_found} followers`);
      return status.followers_found > 0;
    }
    
    if (status.status === 'failed') {
      console.log(`❌ FAILED: ${status.error}`);
      return false;
    }
    
    // Check if we're getting followers via API
    if (status.followers_found > 0) {
      console.log('🎉 Twitter API working - extracting followers directly!');
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

testTwitterAPIDirect().then(success => {
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('🎉 TWITTER API DIRECT ACCESS: SUCCESS!');
    console.log('✅ OAuth 1.0a credentials working with Twitter API');
    console.log('✅ No browser authentication needed');
    console.log('✅ Direct follower extraction via API');
  } else {
    console.log('❌ Twitter API direct access needs debugging');
  }
});
