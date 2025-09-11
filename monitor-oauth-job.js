#!/usr/bin/env node

const https = require('https');

const jobId = 'daytona_1757548162930_f9d261e7';

async function checkJobStatus() {
  return new Promise((resolve, reject) => {
    const req = https.request(`https://followlytics.vercel.app/api/scan/daytona?job_id=${jobId}`, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
        } catch (e) {
          resolve({ error: 'Parse error', body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function monitorJob() {
  console.log(`🔍 Monitoring OAuth job: ${jobId}\n`);
  
  let attempts = 0;
  const maxAttempts = 60; // 10 minutes
  
  while (attempts < maxAttempts) {
    const status = await checkJobStatus();
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(`[${timestamp}] Status: ${status.status} | Phase: ${status.phase} | Progress: ${status.progress}%`);
    console.log(`Message: ${status.message}`);
    
    if (status.followers_found > 0) {
      console.log(`👥 Followers found: ${status.followers_found}`);
    }
    
    if (status.status === 'completed') {
      console.log('\n✅ OAuth scan completed successfully!');
      console.log(`📊 Total followers: ${status.followers_found}`);
      
      if (status.results && status.results.followers) {
        console.log('📋 Sample followers:');
        status.results.followers.slice(0, 5).forEach((f, i) => {
          console.log(`  ${i+1}. @${f.username} (${f.display_name})`);
        });
      }
      return true;
    }
    
    if (status.status === 'failed') {
      console.log('\n❌ OAuth scan failed!');
      console.log(`Error: ${status.error}`);
      if (status.details) {
        console.log(`Details: ${status.details}`);
      }
      return false;
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    attempts++;
  }
  
  console.log('\n⏰ Monitoring timeout');
  return false;
}

monitorJob().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎉 OAuth-authenticated follower extraction: SUCCESS');
  } else {
    console.log('❌ OAuth-authenticated follower extraction: NEEDS DEBUGGING');
  }
  process.exit(success ? 0 : 1);
});
