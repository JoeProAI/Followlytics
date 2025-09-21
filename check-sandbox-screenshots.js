// Check screenshots from the specific sandbox that just ran
const { Daytona } = require('@daytonaio/sdk');
const fs = require('fs');

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567'
});

async function checkRecentSandboxScreenshots() {
  try {
    console.log('🔍 Checking recent sandbox screenshots...');
    
    // The sandbox ID from the log: 3ec0f082-41c9-4e54-be9b-d25a80b86818
    const targetSandboxId = '3ec0f082-41c9-4e54-be9b-d25a80b86818';
    
    // Get all sandboxes to find recent ones
    const sandboxes = await daytona.list();
    console.log(`📊 Found ${sandboxes.length} total sandboxes`);
    
    // Look for the specific sandbox or recent ones
    const recentSandboxes = sandboxes
      .filter(s => s.id === targetSandboxId || new Date(s.createdAt) > new Date(Date.now() - 2 * 60 * 60 * 1000)) // Last 2 hours
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`🎯 Found ${recentSandboxes.length} recent sandboxes to check`);
    
    for (const sandbox of recentSandboxes.slice(0, 3)) {
      console.log(`\n🔍 Checking sandbox: ${sandbox.id}`);
      console.log(`📅 Created: ${sandbox.createdAt}`);
      console.log(`📊 Status: ${sandbox.state}`);
      
      if (sandbox.state === 'stopped') {
        console.log('⚠️ Sandbox is stopped - cannot access files');
        continue;
      }
      
      try {
        // Check if sandbox is accessible
        const pingResult = await sandbox.process.executeCommand('echo "ping" && pwd');
        if (pingResult.exitCode !== 0) {
          console.log('❌ Sandbox not accessible');
          continue;
        }
        
        console.log('✅ Sandbox is accessible');
        
        // List all files in /tmp
        const listResult = await sandbox.process.executeCommand('find /tmp -name "*.png" -o -name "*.json" | sort');
        
        if (listResult.exitCode === 0 && listResult.result) {
          const files = listResult.result.split('\n').filter(f => f.trim());
          console.log(`📁 Found ${files.length} debug files:`);
          
          // Process each file
          for (const file of files) {
            console.log(`\n📄 Processing: ${file}`);
            
            if (file.endsWith('.json')) {
              // Get JSON debug data
              const jsonResult = await sandbox.process.executeCommand(`cat "${file}"`);
              if (jsonResult.exitCode === 0) {
                try {
                  const data = JSON.parse(jsonResult.result);
                  console.log(`  🔍 Step: ${data.step || 'unknown'}`);
                  console.log(`  📝 Description: ${data.description || 'none'}`);
                  console.log(`  🌐 URL: ${data.url || 'unknown'}`);
                  console.log(`  📋 Title: ${data.title || 'unknown'}`);
                  console.log(`  ⏰ Timestamp: ${data.timestamp || 'unknown'}`);
                  
                  // Save locally for analysis
                  const localFilename = `debug_${sandbox.id}_${file.split('/').pop()}`;
                  fs.writeFileSync(localFilename, jsonResult.result);
                  console.log(`  💾 Saved locally: ${localFilename}`);
                } catch (parseError) {
                  console.log(`  ❌ Failed to parse JSON: ${parseError.message}`);
                }
              }
            } else if (file.endsWith('.png')) {
              // Get screenshot info
              const statResult = await sandbox.process.executeCommand(`ls -la "${file}"`);
              if (statResult.exitCode === 0) {
                console.log(`  📸 Screenshot: ${statResult.result.trim()}`);
                
                // Get screenshot as base64 and save locally
                try {
                  const screenshotResult = await sandbox.process.executeCommand(`base64 "${file}"`);
                  if (screenshotResult.exitCode === 0) {
                    const base64Data = screenshotResult.result.replace(/\n/g, '');
                    const buffer = Buffer.from(base64Data, 'base64');
                    const localFilename = `screenshot_${sandbox.id}_${file.split('/').pop()}`;
                    fs.writeFileSync(localFilename, buffer);
                    console.log(`  💾 Screenshot saved: ${localFilename} (${buffer.length} bytes)`);
                  }
                } catch (screenshotError) {
                  console.log(`  ❌ Failed to get screenshot: ${screenshotError.message}`);
                }
              }
            }
          }
          
          // Check for results file
          console.log('\n📊 Checking for results...');
          const resultsResult = await sandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "No results file found"');
          if (resultsResult.exitCode === 0 && !resultsResult.result.includes('No results file found')) {
            try {
              const results = JSON.parse(resultsResult.result);
              console.log('📋 Scan Results:');
              console.log(`  Status: ${results.status}`);
              console.log(`  Followers: ${results.followerCount || 0}`);
              console.log(`  Error: ${results.error || 'none'}`);
              
              if (results.authStatus) {
                console.log('🔐 Authentication Status:');
                console.log(`  Login Page: ${results.authStatus.isLoginPage}`);
                console.log(`  Followers Page: ${results.authStatus.isFollowersPage}`);
                console.log(`  Current URL: ${results.authStatus.currentUrl}`);
                console.log(`  Page Title: ${results.authStatus.pageTitle}`);
                console.log(`  Has Follower Elements: ${results.authStatus.hasFollowerElements}`);
              }
              
              // Save results locally
              fs.writeFileSync(`results_${sandbox.id}.json`, resultsResult.result);
              console.log(`💾 Results saved: results_${sandbox.id}.json`);
            } catch (parseError) {
              console.log('❌ Failed to parse results JSON');
            }
          }
          
          // Check recent logs
          console.log('\n📜 Checking recent logs...');
          const logResult = await sandbox.process.executeCommand('tail -20 /tmp/scan.log 2>/dev/null || echo "No scan log found"');
          if (logResult.exitCode === 0) {
            console.log('Recent logs:');
            logResult.result.split('\n').forEach(line => {
              if (line.trim()) console.log(`  ${line.trim()}`);
            });
          }
          
        } else {
          console.log('📭 No debug files found in /tmp');
        }
        
      } catch (sandboxError) {
        console.log(`❌ Error accessing sandbox: ${sandboxError.message}`);
      }
    }
    
    console.log('\n✅ Screenshot analysis complete!');
    console.log('📁 Check current directory for downloaded screenshots and debug files');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRecentSandboxScreenshots().catch(console.error);
