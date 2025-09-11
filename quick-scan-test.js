#!/usr/bin/env node

/**
 * Quick OAuth Scan Test - Check current job status
 */

const https = require('https');

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, (res) => {
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
    req.end();
  });
}

async function quickTest() {
  console.log('🔍 Quick OAuth Scan Status Check...\n');

  // Check the job that was created
  const jobId = 'daytona_1757545276207_dd5166e7';
  
  try {
    const response = await makeRequest(`https://followlytics.vercel.app/api/scan/daytona?job_id=${jobId}`);
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.status === 'failed') {
      console.log('\n❌ Job failed. Error details:');
      console.log(`Error: ${response.data.error}`);
      console.log(`Details: ${response.data.details}`);
    } else if (response.data.status === 'completed') {
      console.log('\n✅ Job completed successfully!');
      console.log(`Followers found: ${response.data.followers_found}`);
    } else {
      console.log(`\n⏳ Job status: ${response.data.status} | Phase: ${response.data.phase}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest();
