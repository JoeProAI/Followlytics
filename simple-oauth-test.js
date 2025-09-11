#!/usr/bin/env node

const https = require('https');

async function testOAuth() {
  console.log('🔍 Testing OAuth System...\n');

  // Test 1: Submit a simple scan
  const scanData = JSON.stringify({
    username: 'JoeProAI',
    estimated_followers: 100
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
            console.log('✅ Scan submitted successfully');
            console.log(`Job ID: ${data.job_id}`);
            console.log(`Sandbox ID: ${data.sandbox_id}`);
            resolve(data.job_id);
          } else {
            console.log('❌ Scan submission failed');
            resolve(null);
          }
        } catch (e) {
          console.log('Raw response:', body);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      resolve(null);
    });

    req.write(scanData);
    req.end();
  });
}

testOAuth().then(jobId => {
  if (jobId) {
    console.log('\n🎉 OAuth system is working!');
    console.log(`Monitor job at: https://followlytics.vercel.app/api/scan/daytona?job_id=${jobId}`);
  } else {
    console.log('\n❌ OAuth system needs fixing');
  }
});
