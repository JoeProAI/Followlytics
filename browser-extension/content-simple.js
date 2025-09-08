// Simple Twitter Follower Scraper
let isScanning = false;
let followers = [];
let apiKey = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScan') {
    apiKey = message.apiKey;
    startScanning();
    sendResponse({ success: true });
  } else if (message.action === 'stopScan') {
    stopScanning();
    sendResponse({ success: true });
  } else if (message.action === 'retryUpload') {
    retryFailedUpload();
    sendResponse({ success: true });
  }
});

async function retryFailedUpload() {
  try {
    sendProgress('Retrying upload...', 98);
    await attemptUpload();
  } catch (error) {
    console.error('Retry upload failed:', error);
    sendProgress(`Retry failed: ${error.message}`, 100);
  }
}

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
    
    // Get total follower count
    const totalCount = getTotalFollowerCount();
    if (totalCount) {
      sendProgress(`Found ${totalCount} total followers. Starting scan...`, 5);
    }
    
    // Find followers with batch uploads
    await collectFollowersWithBatching(totalCount);
    
    // Mark as complete and stop scanning
    isScanning = false;
    sendComplete();
  } catch (error) {
    isScanning = false;
    sendError(error.message);
  }
}

function getTotalFollowerCount() {
  try {
    // Look for follower count in various places Twitter displays it
    const selectors = [
      'a[href*="/followers"] span',
      '[data-testid="UserName"] + div span',
      'div[dir="ltr"] span[data-testid="app-text-transition-container"]',
      'span:contains("Followers")',
      'div:contains("followers")'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent;
        if (text && /[\d,]+/.test(text)) {
          const match = text.match(/([\d,]+)/);
          if (match) {
            const count = parseInt(match[1].replace(/,/g, ''));
            if (count > 0 && count < 1000000) { // Reasonable follower count
              return count;
            }
          }
        }
      }
    }
    
    // Try to find it in the URL or page title
    const url = window.location.href;
    const match = url.match(/followers.*?(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

async function collectFollowersWithBatching(totalCount) {
  let scrollCount = 0;
  let noNewFollowersCount = 0;
  let previousFollowerCount = 0;
  
  while (isScanning && scrollCount < 100) {
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
    
    // Check if we found new followers this scroll
    if (followers.length === previousFollowerCount) {
      noNewFollowersCount++;
    } else {
      noNewFollowersCount = 0;
      previousFollowerCount = followers.length;
    }
    
    const progress = totalCount ? 
      Math.min((followers.length / totalCount) * 90, 90) : 
      Math.min(scrollCount * 2, 90);
    
    sendProgress(`Found ${followers.length}${totalCount ? `/${totalCount}` : ''} followers...`, progress);
    
    // Stop conditions
    if (totalCount && followers.length >= totalCount) {
      sendProgress(`Reached target! Found all ${followers.length} followers.`, 95);
      break;
    }
    
    if (noNewFollowersCount >= 5) {
      sendProgress(`No new followers found. Completing scan with ${followers.length} followers.`, 95);
      break;
    }
    
    // Scroll down
    window.scrollBy(0, window.innerHeight);
    await sleep(2000);
    scrollCount++;
  }
  
  // Save data locally and try upload
  await saveFollowersLocally();
  await attemptUpload();
}

async function saveFollowersLocally() {
  try {
    const url = window.location.href;
    const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/followers/);
    const username = match ? match[1] : 'unknown';
    
    const scanData = {
      username: username,
      followers: followers,
      scan_metadata: {
        total_followers: followers.length,
        scan_date: new Date().toISOString(),
        scan_url: url
      },
      timestamp: Date.now()
    };
    
    // Save to browser storage
    await chrome.storage.local.set({
      [`followlytics_scan_${username}_${Date.now()}`]: scanData
    });
    
    console.log(`Saved ${followers.length} followers locally for ${username}`);
    sendProgress(`Saved ${followers.length} followers locally. Attempting upload...`, 96);
  } catch (error) {
    console.error('Failed to save locally:', error);
  }
}

async function attemptUpload() {
  try {
    sendProgress(`Attempting to upload ${followers.length} followers...`, 98);
    
    // Try a simple test upload first
    const testResponse = await fetch('https://followlytics.vercel.app/api/extension/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!testResponse.ok) {
      throw new Error(`API validation failed: ${testResponse.status}`);
    }
    
    // If validation works, try uploading in one batch
    await uploadAllFollowers();
    sendProgress(`Success! Uploaded ${followers.length} followers to dashboard.`, 100);
    
  } catch (error) {
    console.error('Upload failed:', error);
    sendProgress(`Scan complete! ${followers.length} followers saved locally. Upload failed - check dashboard for manual upload option.`, 100);
    
    // Send message to popup about failed upload
    chrome.runtime.sendMessage({
      action: 'uploadFailed',
      followersCount: followers.length,
      error: error.message
    });
  }
}

async function uploadAllFollowers() {
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
        scan_date: new Date().toISOString(),
        scan_url: url
      }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Upload failed');
  }
  
  console.log(`Successfully uploaded ${followers.length} followers`);
}

async function uploadFollowersBatch(batchFollowers, batchNumber) {
  if (batchFollowers.length === 0) {
    return;
  }
  
  const url = window.location.href;
  const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/followers/);
  const username = match ? match[1] : 'unknown';
  
  // Retry logic for failed uploads
  let retries = 3;
  let lastError = null;
  
  while (retries > 0) {
    try {
      const response = await fetch('https://followlytics.vercel.app/api/extension/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          username: username,
          followers: batchFollowers,
          scan_metadata: {
            batch_number: batchNumber,
            batch_size: batchFollowers.length,
            total_in_batch: batchFollowers.length,
            scan_date: new Date().toISOString(),
            is_batch: true
          }
        }),
        timeout: 30000 // 30 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      
      console.log(`Batch ${batchNumber} uploaded successfully: ${batchFollowers.length} followers`);
      return; // Success, exit retry loop
      
    } catch (error) {
      lastError = error;
      retries--;
      console.error(`Batch ${batchNumber} upload attempt failed:`, error.message);
      
      if (retries > 0) {
        console.log(`Retrying batch ${batchNumber} in 2 seconds... (${retries} attempts left)`);
        await sleep(2000);
      }
    }
  }
  
  // If all retries failed, throw the last error
  throw new Error(`Batch ${batchNumber} failed after 3 attempts: ${lastError.message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize only on followers pages
if (window.location.href.includes('/followers')) {
  console.log('Followlytics X Follower Tracker extension loaded');
}
