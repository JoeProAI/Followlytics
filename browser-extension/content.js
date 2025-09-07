// Followlytics Browser Extension - Content Script
class TwitterFollowerScraper {
  constructor() {
    this.isScanning = false;
    this.followers = [];
    this.apiKey = null;
    this.currentUsername = null;
    this.scrollCount = 0;
    this.maxScrolls = 100; // Prevent infinite scrolling
    this.lastFollowerCount = 0;
    this.stagnantScrolls = 0;
    this.maxStagnantScrolls = 5;
    
    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message);
    });

    // Extract username from URL
    this.extractUsername();
  }

  extractUsername() {
    const url = window.location.href;
    const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/followers/);
    if (match) {
      this.currentUsername = match[1];
    }
  }

  handleMessage(message) {
    switch (message.action) {
      case 'startScan':
        this.apiKey = message.apiKey;
        this.startScanning();
        break;
      case 'stopScan':
        this.stopScanning();
        break;
    }
  }

  async startScanning() {
    if (this.isScanning) return;
    
    this.isScanning = true;
    this.followers = [];
    this.scrollCount = 0;
    this.stagnantScrolls = 0;
    this.lastFollowerCount = 0;

    this.sendProgress('Starting scan...', 0);

    try {
      // Wait for page to load
      await this.waitForFollowersToLoad();
      
      // Start scrolling and collecting followers
      await this.scrollAndCollect();
      
      // Upload followers to Followlytics
      await this.uploadFollowers();
      
      this.sendComplete();
    } catch (error) {
      this.sendError(error.message);
    }
  }

  stopScanning() {
    this.isScanning = false;
    this.sendProgress('Scan stopped', 0);
  }

  async waitForFollowersToLoad() {
    return new Promise((resolve, reject) => {
      const checkForFollowers = () => {
        const followerElements = document.querySelectorAll('[data-testid="UserCell"]');
        if (followerElements.length > 0) {
          resolve();
        } else if (this.scrollCount > 10) {
          reject(new Error('No followers found. Make sure you\'re on a followers page.'));
        } else {
          this.scrollCount++;
          setTimeout(checkForFollowers, 1000);
        }
      };
      checkForFollowers();
    });
  }

  async scrollAndCollect() {
    while (this.isScanning && this.scrollCount < this.maxScrolls) {
      // Collect current followers on screen
      this.collectVisibleFollowers();
      
      // Check if we're making progress
      if (this.followers.length === this.lastFollowerCount) {
        this.stagnantScrolls++;
        if (this.stagnantScrolls >= this.maxStagnantScrolls) {
          this.sendProgress('Reached end of followers list', 100);
          break;
        }
      } else {
        this.stagnantScrolls = 0;
        this.lastFollowerCount = this.followers.length;
      }

      // Update progress
      const progress = Math.min((this.scrollCount / this.maxScrolls) * 100, 95);
      this.sendProgress(`Scrolling... Found ${this.followers.length} followers`, progress);

      // Scroll down
      window.scrollTo(0, document.body.scrollHeight);
      
      // Wait for new content to load
      await this.sleep(2000 + Math.random() * 1000); // Random delay 2-3 seconds
      
      this.scrollCount++;
    }
  }

  collectVisibleFollowers() {
    const followerElements = document.querySelectorAll('[data-testid="UserCell"]');
    
    followerElements.forEach(element => {
      try {
        const usernameElement = element.querySelector('[data-testid="User-Name"] a');
        const displayNameElement = element.querySelector('[data-testid="User-Name"] span span');
        const bioElement = element.querySelector('[data-testid="User-Description"]');
        const avatarElement = element.querySelector('img[alt][src]');
        
        if (usernameElement && usernameElement.href) {
          const username = usernameElement.href.split('/').pop();
          
          // Skip if we already have this follower
          if (this.followers.some(f => f.username === username)) {
            return;
          }

          const follower = {
            username: username,
            display_name: displayNameElement ? displayNameElement.textContent.trim() : username,
            profile_url: usernameElement.href,
            bio: bioElement ? bioElement.textContent.trim() : null,
            profile_image: avatarElement ? avatarElement.src : null,
            scraped_at: new Date().toISOString(),
            source: 'browser_extension'
          };

          // Validate username format
          if (username.match(/^[a-zA-Z0-9_]{1,15}$/)) {
            this.followers.push(follower);
          }
        }
      } catch (error) {
        console.warn('Error parsing follower element:', error);
      }
    });
  }

  async uploadFollowers() {
    if (this.followers.length === 0) {
      throw new Error('No followers found to upload');
    }

    this.sendProgress('Uploading followers to Followlytics...', 95);

    try {
      const response = await fetch('https://followlytics.vercel.app/api/extension/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          username: this.currentUsername,
          followers: this.followers,
          scan_metadata: {
            total_followers: this.followers.length,
            scroll_count: this.scrollCount,
            scan_duration: Date.now(),
            user_agent: navigator.userAgent
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      throw new Error(`Failed to upload followers: ${error.message}`);
    }
  }

  sendProgress(status, progress) {
    chrome.runtime.sendMessage({
      action: 'scanProgress',
      status: status,
      progress: progress,
      followersFound: this.followers.length
    });
  }

  sendComplete() {
    chrome.runtime.sendMessage({
      action: 'scanComplete',
      totalFollowers: this.followers.length,
      username: this.currentUsername
    });
  }

  sendError(error) {
    chrome.runtime.sendMessage({
      action: 'scanError',
      error: error
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize scraper when content script loads
if (window.location.href.includes('/followers')) {
  new TwitterFollowerScraper();
}
