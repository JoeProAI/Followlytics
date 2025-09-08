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
    // Setup screen
    document.getElementById('connectBtn').addEventListener('click', () => this.connectAccount());
    document.getElementById('openDashboardBtn').addEventListener('click', () => this.openDashboard());

    // Ready screen
    document.getElementById('startScanBtn').addEventListener('click', () => this.startScan());
    document.getElementById('viewDashboardBtn').addEventListener('click', () => this.openDashboard());

    // Scanning screen
    document.getElementById('stopScanBtn').addEventListener('click', () => this.stopScan());

    // Error screen
    document.getElementById('retryBtn').addEventListener('click', () => this.updateUI());
    document.getElementById('resetBtn').addEventListener('click', () => this.resetExtension());

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message);
    });
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
    // Hide all screens
    document.querySelectorAll('#setupScreen, #readyScreen, #scanningScreen, #errorScreen').forEach(screen => {
      screen.classList.add('hidden');
    });

    if (!this.apiKey) {
      document.getElementById('setupScreen').classList.remove('hidden');
    } else if (this.isScanning) {
      document.getElementById('scanningScreen').classList.remove('hidden');
    } else {
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
