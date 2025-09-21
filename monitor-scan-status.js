// Monitor scan status in real-time
const https = require('https');

async function checkScanStatus(scanId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'followlytics.vercel.app',
      port: 443,
      path: `/api/scan/status/${scanId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function monitorScan(scanId) {
  console.log(`🔍 Monitoring scan: ${scanId}`);
  console.log('📊 Checking status every 10 seconds...\n');
  
  const startTime = Date.now();
  const maxDuration = 5 * 60 * 1000; // 5 minutes
  
  while (Date.now() - startTime < maxDuration) {
    try {
      const status = await checkScanStatus(scanId);
      
      const timestamp = new Date().toISOString().substring(11, 19);
      console.log(`⏰ ${timestamp} - Status: ${status.status}`);
      console.log(`📊 Progress: ${status.progress}%`);
      console.log(`👥 Followers: ${status.followerCount}`);
      
      if (status.error) {
        console.log(`❌ Error: ${status.error}`);
      }
      
      if (status.authStatus) {
        console.log(`🔐 Auth Status:`);
        console.log(`  Login Page: ${status.authStatus.isLoginPage}`);
        console.log(`  Followers Page: ${status.authStatus.isFollowersPage}`);
        console.log(`  Current URL: ${status.authStatus.currentUrl}`);
      }
      
      if (status.sandboxId) {
        console.log(`🏗️ Sandbox: ${status.sandboxId}`);
      }
      
      console.log('---');
      
      // Check if completed
      if (status.status === 'completed' || status.status === 'failed') {
        console.log(`\n✅ Scan ${status.status}!`);
        console.log(`📊 Final Results:`);
        console.log(`  Status: ${status.status}`);
        console.log(`  Followers: ${status.followerCount}`);
        console.log(`  Started: ${status.createdAt}`);
        console.log(`  Completed: ${status.completedAt}`);
        
        if (status.error) {
          console.log(`  Error: ${status.error}`);
        }
        
        break;
      }
      
      // Wait 10 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      console.error(`❌ Error checking status: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('\n🏁 Monitoring completed');
}

// Get scan ID from command line argument
const scanId = process.argv[2];

if (!scanId) {
  console.log('Usage: node monitor-scan-status.js <scanId>');
  console.log('Example: node monitor-scan-status.js 2qS0npcyJOi4bB9uXWup');
  process.exit(1);
}

monitorScan(scanId).catch(console.error);
