// Monitor the currently running scan to see what's happening
const { Daytona } = require('@daytonaio/sdk');
const fs = require('fs');

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567'
});

async function monitorActiveScan() {
  try {
    console.log('🔍 Monitoring active scan...');
    
    // Get all sandboxes and find running ones
    const sandboxes = await daytona.list();
    const runningSandboxes = sandboxes.filter(s => s.state === 'started');
    
    console.log(`📊 Found ${runningSandboxes.length} running sandboxes`);
    
    if (runningSandboxes.length === 0) {
      console.log('❌ No running sandboxes found');
      return;
    }
    
    // Monitor the most recent running sandbox
    const activeSandbox = runningSandboxes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    console.log(`🎯 Monitoring sandbox: ${activeSandbox.id}`);
    console.log(`📅 Created: ${activeSandbox.createdAt}`);
    
    // Monitor for 3 minutes
    const monitorDuration = 3 * 60 * 1000; // 3 minutes
    const checkInterval = 10 * 1000; // 10 seconds
    const startTime = Date.now();
    
    console.log('🔄 Starting monitoring (3 minutes)...');
    
    while (Date.now() - startTime < monitorDuration) {
      try {
        console.log(`\n⏰ ${new Date().toISOString()} - Checking sandbox status...`);
        
        // Check if sandbox is still accessible
        const pingResult = await activeSandbox.process.executeCommand('echo "alive" && date');
        if (pingResult.exitCode !== 0) {
          console.log('❌ Sandbox no longer accessible');
          break;
        }
        
        console.log('✅ Sandbox is alive');
        
        // Check for running processes
        const processResult = await activeSandbox.process.executeCommand('ps aux | grep -E "(node|chrome)" | grep -v grep');
        if (processResult.exitCode === 0 && processResult.result.trim()) {
          console.log('🔄 Active processes:');
          processResult.result.split('\n').forEach(line => {
            if (line.trim()) console.log(`  ${line.trim()}`);
          });
        } else {
          console.log('📭 No active Node.js/Chrome processes');
        }
        
        // Check for new screenshots
        const screenshotResult = await activeSandbox.process.executeCommand('find /tmp -name "*.png" -newer /tmp/last_check 2>/dev/null || find /tmp -name "*.png" | tail -3');
        if (screenshotResult.exitCode === 0 && screenshotResult.result.trim()) {
          console.log('📸 Recent screenshots:');
          screenshotResult.result.split('\n').forEach(file => {
            if (file.trim()) console.log(`  ${file.trim()}`);
          });
        }
        
        // Check for debug files
        const debugResult = await activeSandbox.process.executeCommand('find /tmp -name "debug_*.json" | tail -2');
        if (debugResult.exitCode === 0 && debugResult.result.trim()) {
          console.log('📋 Recent debug files:');
          const debugFiles = debugResult.result.split('\n').filter(f => f.trim());
          
          for (const file of debugFiles) {
            const jsonResult = await activeSandbox.process.executeCommand(`cat "${file}"`);
            if (jsonResult.exitCode === 0) {
              try {
                const data = JSON.parse(jsonResult.result);
                console.log(`  📄 ${file.split('/').pop()}: ${data.step} - ${data.description}`);
                console.log(`    🌐 URL: ${data.url}`);
                console.log(`    📝 Title: ${data.title}`);
              } catch (parseError) {
                console.log(`  ❌ Failed to parse: ${file}`);
              }
            }
          }
        }
        
        // Check for results
        const resultsResult = await activeSandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "No results yet"');
        if (resultsResult.exitCode === 0) {
          if (resultsResult.result.includes('No results yet')) {
            console.log('⏳ No results file yet - script still running');
          } else {
            console.log('🎉 Results file found!');
            try {
              const results = JSON.parse(resultsResult.result);
              console.log(`📊 Status: ${results.status}`);
              console.log(`👥 Followers: ${results.followerCount || 0}`);
              console.log(`❌ Error: ${results.error || 'none'}`);
              
              if (results.authStatus) {
                console.log('🔐 Auth Status:');
                console.log(`  Login Page: ${results.authStatus.isLoginPage}`);
                console.log(`  Followers Page: ${results.authStatus.isFollowersPage}`);
                console.log(`  Current URL: ${results.authStatus.currentUrl}`);
              }
              
              // Save results locally
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              fs.writeFileSync(`results_${activeSandbox.id}_${timestamp}.json`, resultsResult.result);
              console.log(`💾 Results saved locally`);
              
              if (results.status === 'completed' || results.status === 'failed') {
                console.log('✅ Script execution completed');
                break;
              }
            } catch (parseError) {
              console.log('❌ Failed to parse results JSON');
            }
          }
        }
        
        // Create checkpoint for next check
        await activeSandbox.process.executeCommand('touch /tmp/last_check');
        
        // Wait before next check
        console.log(`⏳ Waiting ${checkInterval/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        
      } catch (checkError) {
        console.error('❌ Error during check:', checkError.message);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
    
    console.log('\n✅ Monitoring completed');
    
    // Final screenshot collection
    console.log('📸 Collecting final screenshots...');
    try {
      const finalScreenshots = await activeSandbox.process.executeCommand('find /tmp -name "*.png" | sort');
      if (finalScreenshots.exitCode === 0 && finalScreenshots.result.trim()) {
        const screenshots = finalScreenshots.result.split('\n').filter(f => f.trim());
        
        for (const screenshot of screenshots.slice(-5)) { // Last 5 screenshots
          try {
            const screenshotData = await activeSandbox.process.executeCommand(`base64 "${screenshot}"`);
            if (screenshotData.exitCode === 0) {
              const base64Data = screenshotData.result.replace(/\n/g, '');
              const buffer = Buffer.from(base64Data, 'base64');
              const filename = `final_${activeSandbox.id}_${screenshot.split('/').pop()}`;
              fs.writeFileSync(filename, buffer);
              console.log(`📸 Saved: ${filename} (${buffer.length} bytes)`);
            }
          } catch (screenshotError) {
            console.log(`❌ Failed to save screenshot: ${screenshot}`);
          }
        }
      }
    } catch (finalError) {
      console.log('❌ Failed to collect final screenshots');
    }
    
  } catch (error) {
    console.error('❌ Monitoring error:', error.message);
  }
}

monitorActiveScan().catch(console.error);
