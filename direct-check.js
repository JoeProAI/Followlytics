// Direct check using Daytona SDK
const { Daytona } = require('@daytonaio/sdk');

const sandboxId = '042ade46-2e19-47c1-b96b-730c64ce0208';

async function directCheck() {
  try {
    console.log('🔍 Direct check of sandbox:', sandboxId);
    
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567',
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    });

    const sandbox = await daytona.get(sandboxId);
    
    if (!sandbox) {
      console.log('❌ Sandbox not found');
      return;
    }
    
    console.log('✅ Sandbox found, state:', sandbox.state);
    
    // Check if extraction is running
    console.log('🔍 Checking if extraction process is running...');
    const processCheck = await sandbox.process.executeCommand('ps aux | grep -E "(node|simple_scroll)" | grep -v grep || echo "no_processes"');
    const processStatus = processCheck.result || '';
    
    if (processStatus !== 'no_processes') {
      console.log('⏳ EXTRACTION IS RUNNING!');
      console.log('Process info:', processStatus);
    } else {
      console.log('❌ No extraction processes found');
    }
    
    // Check extraction log
    console.log('\n📋 Checking extraction log...');
    const logResponse = await sandbox.process.executeCommand('tail -10 /tmp/extraction.log 2>/dev/null || echo "no_log"');
    const logContent = logResponse.result || '';
    
    if (logContent !== 'no_log') {
      console.log('📄 Recent extraction activity:');
      console.log(logContent);
    } else {
      console.log('❌ No extraction log found');
    }
    
    // Check for results
    console.log('\n📊 Checking for results file...');
    const resultResponse = await sandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "not_ready"');
    const resultContent = resultResponse.result || '';
    
    if (resultContent !== 'not_ready' && resultContent.trim() !== '') {
      console.log('🎉 RESULTS FOUND!');
      try {
        const results = JSON.parse(resultContent);
        console.log('👥 Followers found:', results.followerCount);
        console.log('📅 Status:', results.status);
        console.log('🔧 Strategy:', results.strategy);
        
        if (results.followers && results.followers.length > 0) {
          console.log('\n📝 First 5 followers:');
          results.followers.slice(0, 5).forEach((follower, index) => {
            console.log(`  ${index + 1}. @${follower.username} - ${follower.displayName}`);
          });
        }
      } catch (e) {
        console.log('❌ Error parsing results:', e.message);
        console.log('Raw content:', resultContent.substring(0, 200));
      }
    } else {
      console.log('⏳ Results not ready yet');
    }
    
  } catch (error) {
    console.error('❌ Direct check failed:', error.message);
  }
}

directCheck();
