// Followlytics Browser Extension - Popup Script
class FollowlyticsExtension {
  constructor() {
    this.apiKey = null;
    this.isScanning = false;
    this.followersFound = 0;
    this.init();
  }

  async init() {
    // Load saved API key
    const result = await chrome.storage.sync.get(['followlytics_api_key']);
    this.apiKey = result.followlytics_api_key;

    this.setupEventListeners();
    this.updateUI();
  }

  setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Setup screen
    const connectBtn = document.getElementById('connectBtn');
    const openDashboardBtn = document.getElementById('openDashboardBtn');
    
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        console.log('Connect button clicked');
        this.connectAccount();
      });
    }
    
    if (openDashboardBtn) {
      openDashboardBtn.addEventListener('click', () => {
        console.log('Open dashboard button clicked');
        this.openDashboard();
      });
    }

    // Ready screen
    const startScanBtn = document.getElementById('startScanBtn');
    const viewDashboardBtn = document.getElementById('viewDashboardBtn');
    
    if (startScanBtn) {
      startScanBtn.addEventListener('click', () => {
        console.log('Start scan button clicked');
        this.startScan();
      });
    }
    
    if (viewDashboardBtn) {
      viewDashboardBtn.addEventListener('click', () => {
        console.log('View dashboard button clicked');
        this.openDashboard();
      });
    }

    // Scanning screen
    const stopScanBtn = document.getElementById('stopScanBtn');
    if (stopScanBtn) {
      stopScanBtn.addEventListener('click', () => {
        console.log('Stop scan button clicked');
        this.stopScan();
      });
    }

    // Error screen
    const retryBtn = document.getElementById('retryBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        console.log('Retry button clicked');
        this.updateUI();
      });
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        console.log('Reset button clicked');
        this.resetExtension();
      });
    }

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Popup received message:', message);
      this.handleMessage(message);
    });
    
    console.log('Event listeners setup complete');
  }

  async connectAccount() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    
    if (!apiKey) {
      this.showError('Please enter your API key');
      return;
    }

    try {
      // Validate API key with Followlytics
      const response = await fetch('https://followlytics.vercel.app/api/extension/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ action: 'validate' })
      });

      if (response.ok) {
        // Save API key
        await chrome.storage.sync.set({ followlytics_api_key: apiKey });
        this.apiKey = apiKey;
        this.updateUI();
      } else {
        this.showError('Invalid API key. Please check and try again.');
      }
    } catch (error) {
      this.showError('Connection failed. Please check your internet connection.');
    }
  }

  async startScan() {
    console.log('startScan called, current API key:', this.apiKey ? 'present' : 'missing');
    
    // Check if we're on a Twitter followers page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Current tab URL:', tab.url);
    
    if (!tab.url.includes('twitter.com') && !tab.url.includes('x.com')) {
      this.showError('Please navigate to a Twitter followers page first');
      return;
    }

    if (!tab.url.includes('/followers')) {
      this.showError('Please go to the followers page (click "Followers" on any profile)');
      return;
    }

    console.log('Setting scanning state to true');
    this.isScanning = true;
    this.followersFound = 0;
    this.updateUI();

    try {
      console.log('Sending message to content script...');
      // Send message to content script to start scanning
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'startScan',
        apiKey: this.apiKey
      });
      console.log('Message sent successfully, response:', response);
    } catch (error) {
      console.error('Failed to send message to content script:', error);
      this.showError('Extension not ready. Please refresh the page and try again.');
      this.isScanning = false;
      this.updateUI();
    }
  }

  stopScan() {
    this.isScanning = false;
    
    // Send message to content script to stop scanning
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopScan' });
      }
    });

    this.updateUI();
  }

  handleMessage(message) {
    switch (message.action) {
      case 'scanProgress':
        this.followersFound = message.followersFound;
        document.getElementById('followersFound').textContent = this.followersFound;
        document.getElementById('scanStatus').textContent = message.status;
        
        if (message.progress) {
          document.getElementById('progressFill').style.width = `${message.progress}%`;
        }
        break;

      case 'scanComplete':
        this.isScanning = false;
        this.followersFound = message.totalFollowers;
        this.showSuccess(`Scan complete! Found ${message.totalFollowers} followers`);
        this.updateUI();
        break;

      case 'scanError':
        this.isScanning = false;
        this.showError(message.error);
        break;
    }
  }

  updateUI() {
    console.log('updateUI called - apiKey:', this.apiKey ? 'present' : 'missing', 'isScanning:', this.isScanning);
    
    // Hide all screens
    document.querySelectorAll('#setupScreen, #readyScreen, #scanningScreen, #errorScreen').forEach(screen => {
      screen.classList.add('hidden');
    });

    if (!this.apiKey) {
      console.log('Showing setup screen');
      document.getElementById('setupScreen').classList.remove('hidden');
    } else if (this.isScanning) {
      console.log('Showing scanning screen');
      document.getElementById('scanningScreen').classList.remove('hidden');
    } else {
      console.log('Showing ready screen');
      document.getElementById('readyScreen').classList.remove('hidden');
    }
  }

  showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.querySelectorAll('#setupScreen, #readyScreen, #scanningScreen').forEach(screen => {
      screen.classList.add('hidden');
    });
    document.getElementById('errorScreen').classList.remove('hidden');
  }

  showSuccess(message) {
    // You could add a success screen here if needed
    alert(message);
  }

  openDashboard() {
    chrome.tabs.create({ url: 'https://followlytics.vercel.app/dashboard' });
  }

  async resetExtension() {
    await chrome.storage.sync.clear();
    this.apiKey = null;
    this.isScanning = false;
    this.followersFound = 0;
    document.getElementById('apiKeyInput').value = '';
    this.updateUI();
  }
}

// Initialize extension when popup opens
new FollowlyticsExtension();
