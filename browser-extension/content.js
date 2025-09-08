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
    
    console.log('TwitterFollowerScraper initialized');
    this.init();
  }

  init() {
    console.log('TwitterFollowerScraper init() called');
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Content script received message:', message);
      this.handleMessage(message);
      sendResponse({ received: true });
    });

    // Extract username from URL
    this.extractUsername();
    console.log('Current username extracted:', this.currentUsername);
  }

  extractUsername() {
    const url = window.location.href;
    const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/followers/);
    if (match) {
      this.currentUsername = match[1];
    }
  }

  handleMessage(message) {
    console.log('handleMessage called with:', message);
    switch (message.action) {
      case 'startScan':
        console.log('Starting scan with API key:', message.apiKey ? 'present' : 'missing');
        this.apiKey = message.apiKey;
        this.startScanning();
        break;
      case 'stopScan':
        console.log('Stopping scan');
        this.stopScanning();
        break;
      default:
        console.log('Unknown message action:', message.action);
    }
  }

  async startScanning() {
    console.log('startScanning called, isScanning:', this.isScanning);
    if (this.isScanning) {
      console.log('Already scanning, returning early');
      return;
    }
    
    this.isScanning = true;
    this.followers = [];
    this.scrollCount = 0;
    this.stagnantScrolls = 0;
    this.lastFollowerCount = 0;

    console.log('Starting scan process...');
    this.sendProgress('Initializing scan...', 0);

    try {
      // Scroll to top of page first
      console.log('Scrolling to top...');
      this.sendProgress('Scrolling to top of followers list...', 5);
      window.scrollTo(0, 0);
      await this.sleep(2000);
      
      // Wait for page to load
      console.log('Waiting for followers to load...');
      await this.waitForFollowersToLoad();
      
      // Start scrolling and collecting followers
      console.log('Starting scroll and collect...');
      await this.scrollAndCollect();
      
      // Upload followers to Followlytics
      console.log('Uploading followers...');
      await this.uploadFollowers();
      
      console.log('Scan completed successfully');
      this.sendComplete();
    } catch (error) {
      console.error('Scan error:', error);
      this.sendError(error.message);
      this.isScanning = false;
    }
  }

  stopScanning() {
    this.isScanning = false;
    this.sendProgress('Scan stopped', 0);
  }

  async waitForFollowersToLoad() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 15;
      
      const checkForFollowers = () => {
        // Try multiple selectors for Twitter follower elements
        const selectors = [
          '[data-testid="UserCell"]',
          '[data-testid="cellInnerDiv"]',
          'article[data-testid="tweet"]',
          '[role="button"][aria-label*="Follow"]',
          'div[data-testid="User-Name"]'
        ];
        
        let followerElements = [];
        for (const selector of selectors) {
          followerElements = document.querySelectorAll(selector);
          if (followerElements.length > 0) break;
        }
        
        this.sendProgress(`Checking for followers... (attempt ${attempts + 1})`, 5);
        
        if (followerElements.length > 0) {
          this.sendProgress('Followers found! Starting scan...', 10);
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('No followers found after 15 attempts. Please refresh the page and try again.'));
        } else {
          attempts++;
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
    // Try multiple selectors to find follower elements
    const selectors = [
      '[data-testid="UserCell"]',
      '[data-testid="cellInnerDiv"]',
      'div[data-testid="User-Name"]'
    ];
    
    let followerElements = [];
    for (const selector of selectors) {
      followerElements = document.querySelectorAll(selector);
      if (followerElements.length > 0) break;
    }
    
    followerElements.forEach(element => {
      try {
        // Try multiple ways to find username link
        let usernameElement = element.querySelector('[data-testid="User-Name"] a') ||
                             element.querySelector('a[href*="/"]') ||
                             element.querySelector('a[role="link"]');
        
        // Try multiple ways to find display name
        let displayNameElement = element.querySelector('[data-testid="User-Name"] span span') ||
                                element.querySelector('span[dir="ltr"]') ||
                                element.querySelector('.css-901oao');
        
        // Try multiple ways to find bio
        let bioElement = element.querySelector('[data-testid="User-Description"]') ||
                        element.querySelector('div[dir="ltr"][lang]');
        
        // Try multiple ways to find avatar
        let avatarElement = element.querySelector('img[alt][src]') ||
                           element.querySelector('img[src*="profile_images"]');
        
        if (usernameElement && usernameElement.href && usernameElement.href.includes('/')) {
          const username = usernameElement.href.split('/').pop();
          
          // Skip if we already have this follower or invalid username
          if (this.followers.some(f => f.username === username) || !username) {
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

          // Validate username format (Twitter usernames are 1-15 chars, alphanumeric + underscore)
          if (username.match(/^[a-zA-Z0-9_]{1,15}$/) && !username.includes('http')) {
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

    // Split followers into smaller batches to avoid large payload issues
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < this.followers.length; i += batchSize) {
      batches.push(this.followers.slice(i, i + batchSize));
    }

    let totalUploaded = 0;

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.sendProgress(`Uploading batch ${i + 1}/${batches.length}...`, 95 + (i / batches.length) * 5);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout per batch

        const response = await fetch('https://followlytics.vercel.app/api/extension/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            username: this.currentUsername,
            followers: batch,
            scan_metadata: {
              total_followers: this.followers.length,
              batch_number: i + 1,
              total_batches: batches.length,
              scroll_count: this.scrollCount,
              scan_duration: Date.now(),
              user_agent: navigator.userAgent
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload failed response:', response.status, response.statusText, errorText);
          throw new Error(`Upload failed: ${response.status} ${response.statusText}. ${errorText}`);
        }

        const result = await response.json();
        if (!result.success) {
          console.error('Upload failed result:', result);
          throw new Error(result.error || result.details || 'Upload failed');
        }

        totalUploaded += result.followers_imported || batch.length;
        
        // Small delay between batches
        if (i < batches.length - 1) {
          await this.sleep(1000);
        }
      }

      this.sendProgress(`Upload complete! ${totalUploaded} followers saved.`, 100);

    } catch (error) {
      console.error('Upload error details:', error);
      if (error.name === 'AbortError') {
        throw new Error('Upload timed out. Please try again.');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
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
console.log('Followlytics extension content script loaded on:', window.location.href);

// Global scraper instance
let scraperInstance = null;

// Initialize scraper function
function initializeScraper() {
  if (!scraperInstance) {
    console.log('Creating new TwitterFollowerScraper instance');
    scraperInstance = new TwitterFollowerScraper();
  } else {
    console.log('Scraper instance already exists');
  }
}

// Check if we're on a followers page
if (window.location.href.includes('/followers')) {
  console.log('On followers page, initializing scraper...');
  initializeScraper();
} else {
  console.log('Not on followers page, content script waiting...');
}

// Also listen for URL changes (SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('URL changed to:', url);
    if (url.includes('/followers')) {
      console.log('Navigated to followers page, initializing scraper...');
      initializeScraper();
    }
  }
}).observe(document, { subtree: true, childList: true });
