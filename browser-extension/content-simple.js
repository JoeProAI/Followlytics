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
    
    sendComplete();
  } catch (error) {
    sendError(error.message);
    isScanning = false;
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
  let lastCount = 0;
  let stagnant = 0;
  let batchCount = 0;
  const batchSize = 100;
  
  while (isScanning && scrollCount < 200 && stagnant < 5) {
    // Stop if we've reached the total count
    if (totalCount && followers.length >= totalCount) {
      sendProgress(`Scan complete! Found all ${followers.length} followers.`, 100);
      break;
    }
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
    
    // Upload in batches to prevent memory issues and failures
    if (followers.length >= batchSize && followers.length > lastCount) {
      try {
        batchCount++;
        sendProgress(`Uploading batch ${batchCount} (${followers.length} followers)...`, 
                    totalCount ? Math.min((followers.length / totalCount) * 90, 90) : Math.min(scrollCount * 1.5, 90));
        
        await uploadFollowersBatch(followers.slice(lastCount), batchCount);
        lastCount = followers.length;
        stagnant = 0;
        
        // Small delay after upload
        await sleep(1000);
      } catch (error) {
        console.error('Batch upload failed:', error);
        // Continue scanning even if upload fails
      }
    }
    
    // Check progress - if no new followers found, increment stagnant counter
    if (followers.length === lastCount) {
      stagnant++;
      // If we're stagnant and have found most followers, stop early
      if (stagnant >= 3 && totalCount && followers.length >= totalCount * 0.95) {
        sendProgress(`Scan complete! Found ${followers.length} of ${totalCount} followers.`, 100);
        break;
      }
    } else {
      stagnant = 0;
    }
    
    const progress = totalCount ? 
      Math.min((followers.length / totalCount) * 90, 90) : 
      Math.min(scrollCount * 1.5, 90);
    
    sendProgress(`Found ${followers.length}${totalCount ? `/${totalCount}` : ''} followers...`, progress);
    
    // Stop scrolling if we've likely reached the end
    if (stagnant >= 5 || (totalCount && followers.length >= totalCount)) {
      break;
    }
    
    // Scroll down with variable speed
    window.scrollBy(0, window.innerHeight * 0.8);
    await sleep(1500 + Math.random() * 1000); // 1.5-2.5 second delay
    scrollCount++;
  }
  
  // Upload any remaining followers
  if (followers.length > lastCount) {
    batchCount++;
    sendProgress(`Uploading final batch (${followers.length} total)...`, 95);
    await uploadFollowersBatch(followers.slice(lastCount), batchCount);
  }
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
