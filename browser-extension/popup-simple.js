// Simple popup script
let apiKey = null;
let isScanning = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved API key
  const result = await chrome.storage.sync.get(['followlytics_api_key']);
  apiKey = result.followlytics_api_key;
  
  setupButtons();
  updateUI();
});

function setupButtons() {
  // Connect button
  const connectBtn = document.getElementById('connectBtn');
  if (connectBtn) {
    connectBtn.onclick = connectAccount;
  }
  
  // Start scan button
  const startBtn = document.getElementById('startScanBtn');
  if (startBtn) {
    startBtn.onclick = startScan;
  }
  
  // Stop scan button
  const stopBtn = document.getElementById('stopScanBtn');
  if (stopBtn) {
    stopBtn.onclick = stopScan;
  }
  
  // Dashboard buttons
  document.querySelectorAll('[id*="Dashboard"]').forEach(btn => {
    btn.onclick = () => chrome.tabs.create({ url: 'https://followlytics.vercel.app/dashboard' });
  });
}

async function connectAccount() {
  const input = document.getElementById('apiKeyInput');
  const key = input.value.trim();
  
  if (!key) {
    showError('Please enter your API key');
    return;
  }
  
  try {
    const response = await fetch('https://followlytics.vercel.app/api/extension/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      }
    });
    
    if (response.ok) {
      await chrome.storage.sync.set({ followlytics_api_key: key });
      apiKey = key;
      updateUI();
    } else {
      showError('Invalid API key');
    }
  } catch (error) {
    showError('Connection failed');
  }
}

async function startScan() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
    showError('Please go to X (twitter.com or x.com) first');
    return;
  }
  
  if (!tab.url.includes('/followers')) {
    showError('Please go to a followers page on X');
    return;
  }
  
  isScanning = true;
  updateUI();
  
  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'startScan',
      apiKey: apiKey
    });
  } catch (error) {
    showError('Please refresh the page and try again');
    isScanning = false;
    updateUI();
  }
}

function stopScan() {
  isScanning = false;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stopScan' });
    }
  });
  updateUI();
}

function updateUI() {
  // Hide all screens
  document.querySelectorAll('[id$="Screen"]').forEach(screen => {
    screen.classList.add('hidden');
  });
  
  if (!apiKey) {
    document.getElementById('setupScreen').classList.remove('hidden');
  } else if (isScanning) {
    document.getElementById('scanningScreen').classList.remove('hidden');
  } else {
    document.getElementById('readyScreen').classList.remove('hidden');
  }
}

function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  document.querySelectorAll('[id$="Screen"]').forEach(screen => {
    screen.classList.add('hidden');
  });
  document.getElementById('errorScreen').classList.remove('hidden');
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'progress') {
    updateProgress(message.text, message.percentage);
  } else if (message.action === 'complete') {
    updateProgress('Scan complete!', 100);
    // Show completion alert after a short delay
    setTimeout(() => {
      alert('Scan completed successfully! Check your dashboard to view the results.');
    }, 1000);
  } else if (message.action === 'uploadFailed') {
    handleUploadFailure(message.followersCount, message.error);
  } else if (message.action === 'scanComplete') {
    isScanning = false;
    alert(`Scan complete! Found ${message.totalFollowers} followers. All data has been uploaded to your dashboard.`);
    updateUI();
  } else if (message.action === 'scanError') {
    isScanning = false;
    showError(message.error);
  }
});

function handleUploadFailure(followersCount, error) {
  const statusDiv = document.getElementById('status');
  statusDiv.innerHTML = `
    <div style="color: #ff6b6b; margin-bottom: 10px;">
      <strong>Upload Failed</strong><br>
      Scanned ${followersCount} followers but upload failed.<br>
      Error: ${error}
    </div>
    <div style="margin-bottom: 10px;">
      <button id="retryUpload" style="background: #1da1f2; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">
        Retry Upload
      </button>
      <button id="viewLocal" style="background: #657786; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
        View Saved Data
      </button>
    </div>
    <div style="font-size: 12px; color: #657786;">
      Data saved locally. You can retry upload or check dashboard for manual import.
    </div>
  `;
  
  document.getElementById('retryUpload').addEventListener('click', retryUpload);
  document.getElementById('viewLocal').addEventListener('click', viewLocalData);
}

async function retryUpload() {
  const statusDiv = document.getElementById('status');
  statusDiv.innerHTML = '<div>Retrying upload...</div>';
  
  try {
    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script to retry upload
    chrome.tabs.sendMessage(tab.id, { action: 'retryUpload' });
    
  } catch (error) {
    statusDiv.innerHTML = `<div style="color: #ff6b6b;">Retry failed: ${error.message}</div>`;
  }
}

async function viewLocalData() {
  try {
    const data = await chrome.storage.local.get();
    const scanKeys = Object.keys(data).filter(key => key.startsWith('followlytics_scan_'));
    
    if (scanKeys.length === 0) {
      alert('No saved scan data found.');
      return;
    }
    
    let message = 'Saved scan data:\n\n';
    scanKeys.forEach(key => {
      const scanData = data[key];
      message += `• ${scanData.username}: ${scanData.followers.length} followers (${new Date(scanData.timestamp).toLocaleString()})\n`;
    });
    
    message += '\nYou can manually import this data through the dashboard.';
    alert(message);
    
  } catch (error) {
    alert('Failed to load saved data: ' + error.message);
  }
}
