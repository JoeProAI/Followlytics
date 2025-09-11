#!/usr/bin/env node

const https = require('https');

async function checkResults() {
  console.log('🔍 Checking OAuth Scan Results...\n');

  const jobId = 'daytona_1757548296854_7882ded0';
  
  return new Promise((resolve, reject) => {
    const req = https.request(`https://followlytics.vercel.app/api/scan/daytona?job_id=${jobId}`, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          
          console.log(`📊 Job Status: ${data.status}`);
          console.log(`📈 Progress: ${data.progress}%`);
          console.log(`🔄 Phase: ${data.phase}`);
          console.log(`👥 Followers Found: ${data.followers_found || 0}`);
          
          if (data.results && data.results.followers) {
            console.log(`\n✅ Extracted ${data.results.followers.length} followers:`);
            console.log('📋 Sample Results:');
            
            data.results.followers.slice(0, 10).forEach((follower, i) => {
              console.log(`  ${i+1}. @${follower.username} - ${follower.display_name}`);
              if (follower.bio) {
                console.log(`     Bio: ${follower.bio.substring(0, 80)}...`);
              }
              if (follower.followers_count) {
                console.log(`     Followers: ${follower.followers_count}`);
              }
            });
            
            if (data.results.followers.length > 10) {
              console.log(`     ... and ${data.results.followers.length - 10} more`);
            }
          }
          
          if (data.ai_analysis) {
            console.log('\n🤖 AI Analysis:');
            console.log(JSON.stringify(data.ai_analysis, null, 2));
          }
          
          if (data.metrics) {
            console.log('\n📊 Metrics:');
            console.log(JSON.stringify(data.metrics, null, 2));
          }
          
          if (data.error) {
            console.log(`\n❌ Error: ${data.error}`);
          }
          
          resolve(data);
        } catch (e) {
          console.log('Raw response:', body);
          resolve(null);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

checkResults().then(data => {
  console.log('\n' + '='.repeat(50));
  if (data && data.status === 'completed') {
    console.log('🎉 OAuth scan completed successfully!');
  } else if (data && data.status === 'running') {
    console.log('⏳ OAuth scan still in progress...');
  } else {
    console.log('❓ Checking scan status...');
  }
});
