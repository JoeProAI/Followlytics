// Try to restart the stopped sandbox
const { Daytona } = require('@daytonaio/sdk');

const sandboxId = '3fec89c5-7453-4103-ad73-457cb94dd6a2';

async function restartSandbox() {
  try {
    console.log('🔄 Attempting to restart sandbox:', sandboxId);
    
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567',
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    });

    const sandbox = await daytona.get(sandboxId);
    
    if (!sandbox) {
      console.log('❌ Sandbox not found');
      return;
    }
    
    console.log('📊 Current sandbox state:', sandbox.state);
    
    if (sandbox.state === 'stopped') {
      console.log('🚀 Attempting to start sandbox...');
      
      // Try different methods to start the sandbox
      try {
        if (sandbox.start) {
          await sandbox.start();
          console.log('✅ Sandbox started using sandbox.start()');
        } else if (daytona.start) {
          await daytona.start(sandboxId);
          console.log('✅ Sandbox started using daytona.start()');
        } else {
          console.log('❌ No start method found');
          console.log('Available methods:', Object.getOwnPropertyNames(sandbox));
        }
        
        // Check new state
        const updatedSandbox = await daytona.get(sandboxId);
        console.log('📊 New sandbox state:', updatedSandbox.state);
        
        if (updatedSandbox.state === 'started') {
          console.log('🎉 Sandbox successfully restarted!');
          
          // Now check for results
          console.log('📋 Checking for extraction results...');
          const resultResponse = await updatedSandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "not_ready"');
          const resultContent = resultResponse.result || '';
          
          if (resultContent !== 'not_ready' && resultContent.trim() !== '') {
            console.log('🎉 RESULTS FOUND!');
            try {
              const results = JSON.parse(resultContent);
              console.log('👥 Followers found:', results.followerCount);
              console.log('📅 Status:', results.status);
              console.log('🔧 Strategy:', results.strategy);
              console.log('📸 Screenshots taken:', results.totalScreenshots);
              
              if (results.followers && results.followers.length > 0) {
                console.log('\n📝 First 10 followers:');
                results.followers.slice(0, 10).forEach((follower, index) => {
                  console.log(`  ${index + 1}. @${follower.username} - ${follower.displayName}`);
                });
              }
            } catch (e) {
              console.log('❌ Error parsing results:', e.message);
              console.log('Raw content:', resultContent.substring(0, 200));
            }
          } else {
            console.log('⏳ No results found yet');
          }
          
        } else {
          console.log('❌ Failed to restart sandbox');
        }
        
      } catch (startError) {
        console.log('❌ Error starting sandbox:', startError.message);
      }
      
    } else {
      console.log('✅ Sandbox is already running!');
    }
    
  } catch (error) {
    console.error('❌ Failed to restart sandbox:', error.message);
  }
}

restartSandbox();
