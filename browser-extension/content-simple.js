// Simple Twitter Follower Scraper
let isScanning = false;
let followers = [];
let apiKey = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScan') {
    apiKey = message.apiKey;
    startScan();
    sendResponse({success: true});
  } else if (message.action === 'stopScan') {
    isScanning = false;
    sendResponse({success: true});
  }
});

function sendProgress(status, progress) {
  chrome.runtime.sendMessage({
    action: 'scanProgress',
    status: status,
    progress: progress,
    followersFound: followers.length
  });
}

function sendComplete() {
  chrome.runtime.sendMessage({
    action: 'scanComplete',
    totalFollowers: followers.length
  });
}

function sendError(error) {
  chrome.runtime.sendMessage({
    action: 'scanError',
    error: error
  });
}

async function startScan() {
  if (isScanning) return;
  
  isScanning = true;
  followers = [];
  
  sendProgress('Starting scan...', 0);
  
  try {
    // Scroll to top
    window.scrollTo(0, 0);
    await sleep(2000);
    
    // Find followers
    await collectFollowers();
    
    // Upload
    await uploadFollowers();
    
    sendComplete();
  } catch (error) {
    sendError(error.message);
    isScanning = false;
  }
}

async function collectFollowers() {
  let scrollCount = 0;
  let lastCount = 0;
  let stagnant = 0;
  
  while (isScanning && scrollCount < 50 && stagnant < 3) {
    // Get current followers on screen
    const elements = document.querySelectorAll('[data-testid="UserCell"], [data-testid="cellInnerDiv"]');
    
    elements.forEach(element => {
      try {
        const link = element.querySelector('a[href*="/"]');
        if (link && link.href) {
          const username = link.href.split('/').pop();
          if (username && username.match(/^[a-zA-Z0-9_]{1,15}$/) && !followers.some(f => f.username === username)) {
            followers.push({
              username: username,
              profile_url: link.href,
              scraped_at: new Date().toISOString()
            });
          }
        }
      } catch (e) {}
    });
    
    // Check progress
    if (followers.length === lastCount) {
      stagnant++;
    } else {
      stagnant = 0;
      lastCount = followers.length;
    }
    
    sendProgress(`Found ${followers.length} followers...`, Math.min(scrollCount * 2, 90));
    
    // Scroll down
    window.scrollBy(0, window.innerHeight);
    await sleep(2000);
    scrollCount++;
  }
}

async function uploadFollowers() {
  if (followers.length === 0) {
    throw new Error('No followers found');
  }
  
  sendProgress('Uploading...', 95);
  
  const url = window.location.href;
  const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/followers/);
  const username = match ? match[1] : 'unknown';
  
  const response = await fetch('https://followlytics.vercel.app/api/extension/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      username: username,
      followers: followers,
      scan_metadata: {
        total_followers: followers.length,
        scan_date: new Date().toISOString()
      }
    })
  });
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Upload failed');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize only on followers pages
if (window.location.href.includes('/followers')) {
  console.log('Followlytics extension loaded');
}
