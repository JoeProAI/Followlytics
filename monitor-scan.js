// Real-time scan monitor with visual feedback
const { Daytona } = require('@daytonaio/sdk');
const fs = require('fs');
const path = require('path');

const sandboxId = '00e121ad-9471-4031-8b2b-f057b3537a01';

class ScanMonitor {
  constructor(sandboxId) {
    this.sandboxId = sandboxId;
    this.daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY || 'dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567',
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    });
    this.sandbox = null;
    this.lastScreenshotCount = 0;
    this.lastFollowerCount = 0;
  }

  async initialize() {
    try {
      this.sandbox = await this.daytona.get(this.sandboxId);
      if (!this.sandbox) {
        throw new Error('Sandbox not found');
      }
      console.log('✅ Connected to sandbox:', this.sandboxId);
      console.log('📊 Sandbox state:', this.sandbox.state);
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to sandbox:', error.message);
      return false;
    }
  }

  async checkProgress() {
    try {
      // Check if extraction is running
      const processCheck = await this.sandbox.process.executeCommand('ps aux | grep -E "(node|puppeteer)" | grep -v grep | wc -l');
      const processCount = parseInt(processCheck.result || '0');
      
      // Get latest log entries
      const logResponse = await this.sandbox.process.executeCommand('tail -5 /tmp/extraction.log 2>/dev/null || echo "no_log"');
      const logContent = logResponse.result || '';
      
      // Count screenshots
      const screenshotResponse = await this.sandbox.process.executeCommand('ls /tmp/screenshot_*.png 2>/dev/null | wc -l');
      const screenshotCount = parseInt(screenshotResponse.result || '0');
      
      // Check for results
      let followerCount = 0;
      let status = 'running';
      const resultResponse = await this.sandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "not_ready"');
      const resultContent = resultResponse.result || '';
      
      if (resultContent !== 'not_ready' && resultContent.trim() !== '') {
        try {
          const results = JSON.parse(resultContent);
          followerCount = results.followerCount || 0;
          status = results.status || 'unknown';
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      return {
        processCount,
        logContent,
        screenshotCount,
        followerCount,
        status,
        isRunning: processCount > 0 || status === 'running'
      };
      
    } catch (error) {
      console.error('❌ Error checking progress:', error.message);
      return null;
    }
  }

  async downloadLatestScreenshot() {
    try {
      // Get the latest screenshot
      const latestResponse = await this.sandbox.process.executeCommand('ls -t /tmp/screenshot_*.png 2>/dev/null | head -1');
      const latestFile = latestResponse.result?.trim();
      
      if (!latestFile) {
        return null;
      }
      
      const filename = path.basename(latestFile);
      const localPath = path.join('./screenshots', filename);
      
      // Create screenshots directory if it doesn't exist
      if (!fs.existsSync('./screenshots')) {
        fs.mkdirSync('./screenshots');
      }
      
      // Skip if we already have this screenshot
      if (fs.existsSync(localPath)) {
        return localPath;
      }
      
      // Download the screenshot
      const fileResponse = await this.sandbox.process.executeCommand(`base64 ${latestFile}`);
      const base64Content = fileResponse.result || '';
      
      if (base64Content && base64Content.trim()) {
        const buffer = Buffer.from(base64Content.trim(), 'base64');
        fs.writeFileSync(localPath, buffer);
        return localPath;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error downloading screenshot:', error.message);
      return null;
    }
  }

  displayProgress(progress) {
    // Clear console for real-time updates
    console.clear();
    
    console.log('🚀 FOLLOWLYTICS SCAN MONITOR');
    console.log('============================');
    console.log(`📦 Sandbox: ${this.sandboxId}`);
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}`);
    console.log('');
    
    if (progress.isRunning) {
      console.log('🟢 STATUS: EXTRACTION RUNNING');
      console.log(`⚙️  Processes: ${progress.processCount}`);
      console.log(`📸 Screenshots: ${progress.screenshotCount}`);
      console.log(`👥 Followers Found: ${progress.followerCount}`);
      
      // Show progress indicators
      if (progress.screenshotCount > this.lastScreenshotCount) {
        console.log('📸 NEW SCREENSHOT CAPTURED!');
        this.lastScreenshotCount = progress.screenshotCount;
      }
      
      if (progress.followerCount > this.lastFollowerCount) {
        console.log(`🎉 NEW FOLLOWERS FOUND! (+${progress.followerCount - this.lastFollowerCount})`);
        this.lastFollowerCount = progress.followerCount;
      }
      
    } else if (progress.status === 'completed' || progress.status === 'success') {
      console.log('🎉 STATUS: EXTRACTION COMPLETED!');
      console.log(`👥 Total Followers: ${progress.followerCount}`);
      console.log(`📸 Screenshots Taken: ${progress.screenshotCount}`);
      
    } else if (progress.status === 'failed') {
      console.log('❌ STATUS: EXTRACTION FAILED');
      console.log(`📸 Screenshots Available: ${progress.screenshotCount}`);
      
    } else {
      console.log('⏳ STATUS: CHECKING...');
    }
    
    console.log('');
    console.log('📋 RECENT ACTIVITY:');
    if (progress.logContent !== 'no_log') {
      const logLines = progress.logContent.split('\n').filter(line => line.trim());
      logLines.slice(-3).forEach(line => {
        if (line.trim()) {
          console.log(`   ${line.trim()}`);
        }
      });
    } else {
      console.log('   No recent activity logged');
    }
    
    console.log('');
    console.log('💡 CONTROLS:');
    console.log('   Press Ctrl+C to stop monitoring');
    console.log('   Screenshots auto-download to ./screenshots/');
  }

  async startMonitoring() {
    console.log('🚀 Starting real-time scan monitoring...');
    
    if (!(await this.initialize())) {
      return;
    }
    
    const monitorInterval = setInterval(async () => {
      const progress = await this.checkProgress();
      
      if (progress) {
        this.displayProgress(progress);
        
        // Download latest screenshot
        const latestScreenshot = await this.downloadLatestScreenshot();
        if (latestScreenshot) {
          console.log(`📸 Downloaded: ${latestScreenshot}`);
        }
        
        // Stop monitoring if extraction is complete
        if (!progress.isRunning && (progress.status === 'completed' || progress.status === 'failed')) {
          console.log('\n🏁 Extraction finished. Stopping monitor...');
          clearInterval(monitorInterval);
          
          // Final screenshot download
          await this.downloadAllScreenshots();
        }
      }
      
    }, 5000); // Check every 5 seconds
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping monitor...');
      clearInterval(monitorInterval);
      process.exit(0);
    });
  }

  async downloadAllScreenshots() {
    console.log('\n📸 Downloading all screenshots...');
    
    try {
      const listResponse = await this.sandbox.process.executeCommand('ls /tmp/screenshot_*.png 2>/dev/null || echo "no_screenshots"');
      const fileList = listResponse.result || '';
      
      if (fileList === 'no_screenshots') {
        console.log('❌ No screenshots found');
        return;
      }
      
      const files = fileList.split('\n').filter(line => line.includes('screenshot_'));
      console.log(`📦 Found ${files.length} screenshots to download`);
      
      for (const fileLine of files) {
        const filename = fileLine.trim().split(/\s+/).pop().split('/').pop();
        if (filename && filename.endsWith('.png')) {
          const localPath = path.join('./screenshots', filename);
          
          if (!fs.existsSync(localPath)) {
            const fileResponse = await this.sandbox.process.executeCommand(`base64 /tmp/${filename}`);
            const base64Content = fileResponse.result || '';
            
            if (base64Content && base64Content.trim()) {
              const buffer = Buffer.from(base64Content.trim(), 'base64');
              fs.writeFileSync(localPath, buffer);
              console.log(`✅ Downloaded: ${filename}`);
            }
          }
        }
      }
      
      console.log(`🎯 All screenshots saved to: ${path.resolve('./screenshots')}`);
      
    } catch (error) {
      console.error('❌ Error downloading screenshots:', error.message);
    }
  }
}

// Start monitoring
const monitor = new ScanMonitor(sandboxId);
monitor.startMonitoring();
