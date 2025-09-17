// Direct result checker using Daytona SDK
const { Daytona } = require('@daytonaio/sdk');

const sandboxId = '52917708-d2f8-44dc-9995-24b4e3b12663';

async function checkResults() {
  try {
    console.log('🔍 Checking extraction results...');
    console.log('Sandbox ID:', sandboxId);
    
    // Initialize Daytona client
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567',
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    });

    console.log('📡 Connecting to sandbox...');
    const sandbox = await daytona.get(sandboxId);
    
    if (!sandbox) {
      console.log('❌ Sandbox not found');
      return;
    }
    
    console.log('✅ Connected to sandbox');
    console.log('Sandbox state:', sandbox.state);
    
    // Check for results file
    console.log('📄 Checking for results file...');
    const resultResponse = await sandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "not_found"');
    const resultContent = resultResponse.result || '';
    
    if (resultContent === 'not_found' || resultContent.trim() === '') {
      console.log('⏳ Results file not found, checking extraction log...');
      
      // Check extraction log
      const logResponse = await sandbox.process.executeCommand('tail -20 /tmp/extraction.log 2>/dev/null || echo "no_log"');
      const logContent = logResponse.result || '';
      
      if (logContent !== 'no_log') {
        console.log('📋 Recent extraction activity:');
        console.log(logContent);
      } else {
        console.log('❌ No extraction log found');
      }
      
      // Check if process is still running
      const processCheck = await sandbox.process.executeCommand('ps aux | grep "node simple_scroll.js" | grep -v grep || echo "not_running"');
      const processStatus = processCheck.result || '';
      
      if (processStatus === 'not_running') {
        console.log('❌ Extraction process is not running');
      } else {
        console.log('⏳ Extraction process is still running');
        console.log('Process info:', processStatus);
      }
      
    } else {
      console.log('🎉 RESULTS FOUND!');
      
      try {
        const results = JSON.parse(resultContent);
        console.log('📊 EXTRACTION RESULTS:');
        console.log('✅ Status:', results.status);
        console.log('👥 Followers found:', results.followerCount);
        console.log('📅 Scan date:', results.scanDate);
        console.log('🔧 Strategy:', results.strategy);
        console.log('👤 Username:', results.username);
        
        if (results.followers && results.followers.length > 0) {
          console.log('📝 First 10 followers:');
          results.followers.slice(0, 10).forEach((follower, index) => {
            console.log(`  ${index + 1}. @${follower.username} (${follower.displayName})`);
          });
          
          if (results.followers.length > 10) {
            console.log(`  ... and ${results.followers.length - 10} more followers`);
          }
        }
        
        if (results.apiVerification) {
          console.log('🔍 API Verification:');
          console.log('  Actual followers:', results.apiVerification.actualFollowerCount);
          console.log('  Extracted:', results.apiVerification.extractedCount);
          console.log('  Accuracy:', results.apiVerification.accuracy + '%');
        }
        
      } catch (parseError) {
        console.log('❌ Error parsing results:', parseError.message);
        console.log('Raw content:', resultContent.substring(0, 500));
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to check results:', error.message);
  }
}

checkResults();
