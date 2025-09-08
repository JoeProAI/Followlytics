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
  let lastUploadedCount = 0;
  let noNewFollowersCount = 0;
  let batchCount = 0;
  const batchSize = 100;
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
    
    // Upload in batches
    if (followers.length >= lastUploadedCount + batchSize) {
      try {
        batchCount++;
        const batchToUpload = followers.slice(lastUploadedCount);
        sendProgress(`Uploading batch ${batchCount} (${batchToUpload.length} new followers)...`, 
                    totalCount ? Math.min((followers.length / totalCount) * 85, 85) : Math.min(scrollCount * 2, 85));
        
        await uploadFollowersBatch(batchToUpload, batchCount);
        lastUploadedCount = followers.length;
        
        await sleep(500);
      } catch (error) {
        console.error('Batch upload failed:', error);
      }
    }
    
    const progress = totalCount ? 
      Math.min((followers.length / totalCount) * 85, 85) : 
      Math.min(scrollCount * 2, 85);
    
    sendProgress(`Found ${followers.length}${totalCount ? `/${totalCount}` : ''} followers...`, progress);
    
    // Stop conditions
    if (totalCount && followers.length >= totalCount) {
      sendProgress(`Reached target! Found all ${followers.length} followers.`, 90);
      break;
    }
    
    if (noNewFollowersCount >= 5) {
      sendProgress(`No new followers found. Completing scan with ${followers.length} followers.`, 90);
      break;
    }
    
    // Scroll down
    window.scrollBy(0, window.innerHeight);
    await sleep(2000);
    scrollCount++;
  }
  
  // Upload any remaining followers
  if (followers.length > lastUploadedCount) {
    batchCount++;
    const finalBatch = followers.slice(lastUploadedCount);
    sendProgress(`Uploading final batch (${finalBatch.length} remaining followers)...`, 95);
    await uploadFollowersBatch(finalBatch, batchCount);
  }
  
  // Final completion message
  sendProgress(`Scan complete! Successfully uploaded ${followers.length} followers to dashboard.`, 100);
}

async function uploadFollowersBatch(batchFollowers, batchNumber) {
  if (batchFollowers.length === 0) {
    return;
  }
  
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
      followers: batchFollowers,
      scan_metadata: {
        batch_number: batchNumber,
        batch_size: batchFollowers.length,
        total_in_batch: batchFollowers.length,
        scan_date: new Date().toISOString(),
        is_batch: true
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Batch ${batchNumber} upload failed: ${response.status}`);
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(`Batch ${batchNumber} failed: ${result.error || 'Upload failed'}`);
  }
  
  console.log(`Batch ${batchNumber} uploaded successfully: ${batchFollowers.length} followers`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize only on followers pages
if (window.location.href.includes('/followers')) {
  console.log('Followlytics extension loaded');
}
