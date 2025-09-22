document.addEventListener('DOMContentLoaded', function() {
  const statusDiv = document.getElementById('status');
  const userIdInput = document.getElementById('userId');
  const captureBtn = document.getElementById('captureBtn');
  const testBtn = document.getElementById('testBtn');

  // Load saved user ID
  chrome.storage.sync.get(['userId'], function(result) {
    if (result.userId) {
      userIdInput.value = result.userId;
    }
  });

  // Save user ID when changed
  userIdInput.addEventListener('change', function() {
    chrome.storage.sync.set({userId: userIdInput.value});
  });

  function updateStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }

  function isOnXSite() {
    return new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const url = tabs[0].url;
        resolve(url.includes('x.com') || url.includes('twitter.com'));
      });
    });
  }

  testBtn.addEventListener('click', async function() {
    testBtn.disabled = true;
    updateStatus('Testing connection...', 'info');

    try {
      const response = await fetch('https://followlytics-zeta.vercel.app/api/auth/x-session-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        updateStatus('✅ Connection successful!', 'success');
      } else {
        updateStatus('⚠️ Connection works but needs authentication', 'info');
      }
    } catch (error) {
      updateStatus('❌ Connection failed: ' + error.message, 'error');
    } finally {
      testBtn.disabled = false;
    }
  });

  captureBtn.addEventListener('click', async function() {
    const userId = userIdInput.value.trim();
    
    if (!userId) {
      updateStatus('❌ Please enter your User ID', 'error');
      return;
    }

    // Check if on X.com
    const onXSite = await isOnXSite();
    if (!onXSite) {
      updateStatus('❌ Please navigate to x.com first', 'error');
      return;
    }

    captureBtn.disabled = true;
    updateStatus('🔄 Capturing session...', 'info');

    try {
      // Execute content script to capture session
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'captureSession',
          userId: userId
        }, function(response) {
          if (chrome.runtime.lastError) {
            updateStatus('❌ Error: ' + chrome.runtime.lastError.message, 'error');
            captureBtn.disabled = false;
            return;
          }

          if (response && response.success) {
            updateStatus('✅ Session captured successfully!', 'success');
            // Auto-close popup after 2 seconds
            setTimeout(() => {
              window.close();
            }, 2000);
          } else {
            updateStatus('❌ Capture failed: ' + (response?.error || 'Unknown error'), 'error');
          }
          captureBtn.disabled = false;
        });
      });
    } catch (error) {
      updateStatus('❌ Error: ' + error.message, 'error');
      captureBtn.disabled = false;
    }
  });
});
