// Simple results checker - run this after starting a scan
const https = require('https');

// You'll need to update this with your actual sandbox ID after starting a scan
let SANDBOX_ID = 'UPDATE_THIS_WITH_SANDBOX_ID_FROM_SCAN_OUTPUT';

// If you provide sandbox ID as command line argument
if (process.argv[2]) {
  SANDBOX_ID = process.argv[2];
}

async function checkResults() {
  if (SANDBOX_ID === 'UPDATE_THIS_WITH_SANDBOX_ID_FROM_SCAN_OUTPUT') {
    console.log('❌ Please update SANDBOX_ID in the script or provide it as argument:');
    console.log('   node check-my-results.js YOUR_SANDBOX_ID');
    return;
  }

  console.log('🔍 Checking results for sandbox:', SANDBOX_ID);
  console.log('⏳ This may take a few seconds...\n');

  try {
    const url = `https://followlytics-git-main-joeproais-projects.vercel.app/api/scan/check-results?sandboxId=${SANDBOX_ID}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📊 EXTRACTION STATUS:');
    console.log('Status:', data.status);
    console.log('Message:', data.message);
    console.log('Timestamp:', data.timestamp);
    
    if (data.status === 'completed') {
      console.log('\n🎉 EXTRACTION COMPLETED!');
      console.log('👥 Total followers found:', data.result.followerCount);
      console.log('📅 Scan date:', data.result.scanDate);
      console.log('🔧 Strategy:', data.result.strategy);
      console.log('👤 Username:', data.result.username);
      
      if (data.result.followersPreview && data.result.followersPreview.length > 0) {
        console.log('\n📝 First 10 followers preview:');
        data.result.followersPreview.forEach((follower, index) => {
          console.log(`  ${index + 1}. @${follower.username} - ${follower.displayName}`);
        });
        
        if (data.result.totalFollowers > 10) {
          console.log(`  ... and ${data.result.totalFollowers - 10} more followers`);
        }
      }
      
    } else if (data.status === 'running') {
      console.log('\n⏳ EXTRACTION STILL RUNNING...');
      console.log('Processes running:', data.processesRunning);
      
      if (data.lastLogLines && data.lastLogLines.length > 0) {
        console.log('\n📋 Recent activity:');
        data.lastLogLines.forEach(line => {
          if (line.trim()) console.log('  ', line);
        });
      }
      
      console.log('\n💡 Run this command again in 2-3 minutes to check progress.');
      
    } else if (data.status === 'checking') {
      console.log('\n🔍 CHECKING FOR COMPLETION...');
      console.log('💡 The extraction may have finished. Run this command again in 1 minute.');
      
    } else {
      console.log('\n❌ STATUS:', data.status);
      if (data.error) {
        console.log('Error:', data.error);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to check results:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. The sandbox ID is correct');
    console.log('2. The extraction was started recently');
    console.log('3. Your internet connection is working');
  }
}

// Auto-refresh every 30 seconds if extraction is running
async function autoCheck() {
  await checkResults();
  
  // Only auto-refresh if we're in a terminal (not if output is redirected)
  if (process.stdout.isTTY) {
    console.log('\n⏰ Will check again in 30 seconds... (Press Ctrl+C to stop)');
    setTimeout(autoCheck, 30000);
  }
}

console.log('🚀 Followlytics Results Checker');
console.log('================================\n');

autoCheck();
