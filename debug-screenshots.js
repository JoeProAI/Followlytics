const { Daytona } = require('@daytonaio/sdk');
const fs = require('fs');
const path = require('path');

// Initialize Daytona SDK
const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567'
});

async function getAllScreenshots() {
  try {
    console.log('🔍 Listing all sandboxes...');
    
    // Get all sandboxes - try different API methods
    let sandboxes;
    try {
      sandboxes = await daytona.list();
    } catch (e1) {
      try {
        sandboxes = await daytona.workspace.list();
      } catch (e2) {
        console.log('Available daytona methods:', Object.keys(daytona));
        throw new Error('Could not find sandbox list method');
      }
    }
    
    console.log(`📊 Found ${sandboxes.length} sandboxes`);
    
    for (const sandbox of sandboxes.slice(0, 3)) { // Check last 3 sandboxes
      console.log(`\n🔍 Checking sandbox: ${sandbox.id}`);
      console.log(`📅 Created: ${sandbox.createdAt}`);
      console.log(`📊 Status: ${sandbox.state}`);
      
      try {
        // List files in /tmp directory
        const listResult = await sandbox.process.executeCommand('find /tmp -name "*.png" -o -name "*.json" | head -20');
        
        if (listResult.exitCode === 0 && listResult.result) {
          const files = listResult.result.split('\n').filter(f => f.trim());
          console.log(`📁 Found ${files.length} debug files:`);
          
          for (const file of files) {
            console.log(`  📄 ${file}`);
            
            if (file.endsWith('.png')) {
              // Get screenshot as base64
              try {
                const screenshotResult = await sandbox.process.executeCommand(`base64 "${file}"`);
                if (screenshotResult.exitCode === 0) {
                  const filename = `screenshot_${sandbox.id}_${path.basename(file)}`;
                  const base64Data = screenshotResult.result.replace(/\n/g, '');
                  
                  // Save screenshot locally
                  const buffer = Buffer.from(base64Data, 'base64');
                  fs.writeFileSync(filename, buffer);
                  console.log(`  📸 Saved: ${filename} (${buffer.length} bytes)`);
                }
              } catch (screenshotError) {
                console.log(`  ❌ Failed to get screenshot: ${screenshotError.message}`);
              }
            } else if (file.endsWith('.json')) {
              // Get JSON debug data
              try {
                const jsonResult = await sandbox.process.executeCommand(`cat "${file}"`);
                if (jsonResult.exitCode === 0) {
                  const filename = `debug_${sandbox.id}_${path.basename(file)}`;
                  fs.writeFileSync(filename, jsonResult.result);
                  console.log(`  📋 Saved: ${filename}`);
                  
                  // Parse and show key info
                  try {
                    const data = JSON.parse(jsonResult.result);
                    console.log(`    🔍 Step: ${data.step || 'unknown'}`);
                    console.log(`    🌐 URL: ${data.url || 'unknown'}`);
                    console.log(`    📝 Title: ${data.title || 'unknown'}`);
                  } catch (parseError) {
                    console.log(`    ⚠️ Could not parse JSON`);
                  }
                }
              } catch (jsonError) {
                console.log(`  ❌ Failed to get JSON: ${jsonError.message}`);
              }
            }
          }
        } else {
          console.log(`  📭 No debug files found in /tmp`);
        }
        
        // Check for any running processes
        const processResult = await sandbox.process.executeCommand('ps aux | grep -E "(node|chrome|firefox)" | grep -v grep');
        if (processResult.exitCode === 0 && processResult.result) {
          console.log(`  🔄 Running processes:`);
          processResult.result.split('\n').forEach(line => {
            if (line.trim()) console.log(`    ${line.trim()}`);
          });
        }
        
        // Check recent logs
        const logResult = await sandbox.process.executeCommand('tail -20 /tmp/scan.log 2>/dev/null || echo "No scan log found"');
        if (logResult.exitCode === 0 && logResult.result) {
          console.log(`  📜 Recent logs:`);
          logResult.result.split('\n').slice(-5).forEach(line => {
            if (line.trim()) console.log(`    ${line.trim()}`);
          });
        }
        
      } catch (sandboxError) {
        console.log(`  ❌ Error accessing sandbox: ${sandboxError.message}`);
      }
    }
    
    console.log('\n✅ Screenshot analysis complete!');
    console.log('📁 Check the current directory for downloaded screenshots and debug files');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the analysis
getAllScreenshots().catch(console.error);
