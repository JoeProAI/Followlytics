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
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'scanProgress') {
    document.getElementById('followersFound').textContent = message.followersFound || 0;
    document.getElementById('scanStatus').textContent = message.status || 'Scanning...';
    
    if (message.progress) {
      document.getElementById('progressFill').style.width = `${message.progress}%`;
    }
    
    // If progress is 100%, automatically complete
    if (message.progress >= 100) {
      setTimeout(() => {
        isScanning = false;
        alert(`Scan complete! Found ${message.followersFound} followers. Check your dashboard to view them.`);
        updateUI();
      }, 1000);
    }
  } else if (message.action === 'scanComplete') {
    isScanning = false;
    alert(`Scan complete! Found ${message.totalFollowers} followers. All data has been uploaded to your dashboard.`);
    updateUI();
  } else if (message.action === 'scanError') {
    isScanning = false;
    showError(message.error);
  }
});
