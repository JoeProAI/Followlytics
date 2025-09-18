// Download screenshots from sandbox to see what's on the page
const { Daytona } = require('@daytonaio/sdk');
const fs = require('fs');
const path = require('path');

const sandboxId = '438e029e-9600-4e94-b9c5-9d447e5f9848';

async function downloadScreenshots() {
  try {
    console.log('📸 Downloading screenshots from sandbox:', sandboxId);
    
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567',
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    });

    const sandbox = await daytona.get(sandboxId);
    
    if (!sandbox) {
      console.log('❌ Sandbox not found');
      return;
    }
    
    console.log('✅ Connected to sandbox');
    
    // Create screenshots directory
    const screenshotsDir = './screenshots';
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    
    // List all screenshot files
    const listResponse = await sandbox.process.executeCommand('ls -la /tmp/screenshot_*.png 2>/dev/null || echo "no_screenshots"');
    const fileList = listResponse.result || '';
    
    if (fileList === 'no_screenshots') {
      console.log('❌ No screenshots found in sandbox');
      return;
    }
    
    console.log('📋 Found screenshots:');
    console.log(fileList);
    
    // Extract screenshot filenames
    const lines = fileList.split('\n').filter(line => line.includes('screenshot_'));
    const screenshotFiles = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      const fullPath = parts[parts.length - 1]; // Last part is full path
      return fullPath.split('/').pop(); // Get just the filename
    }).filter(filename => filename.endsWith('.png'));
    
    console.log(`📸 Downloading ${screenshotFiles.length} screenshots...`);
    
    for (const filename of screenshotFiles) {
      try {
        console.log(`⬇️ Downloading ${filename}...`);
        
        // Get file content as base64
        const fileResponse = await sandbox.process.executeCommand(`base64 /tmp/${filename}`);
        const base64Content = fileResponse.result || '';
        
        if (base64Content && base64Content.trim()) {
          // Save to local file
          const localPath = path.join(screenshotsDir, filename);
          const buffer = Buffer.from(base64Content.trim(), 'base64');
          fs.writeFileSync(localPath, buffer);
          
          console.log(`✅ Saved: ${localPath} (${buffer.length} bytes)`);
        } else {
          console.log(`❌ Failed to get content for ${filename}`);
        }
        
      } catch (error) {
        console.log(`❌ Error downloading ${filename}:`, error.message);
      }
    }
    
    console.log(`\n🎯 Downloaded screenshots to: ${path.resolve(screenshotsDir)}`);
    console.log('💡 Open the screenshots to see what the extraction script was seeing on each scroll!');
    
  } catch (error) {
    console.error('❌ Failed to download screenshots:', error.message);
  }
}

downloadScreenshots();
