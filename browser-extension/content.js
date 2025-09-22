// Content script that runs on X.com pages
console.log('🔐 Followlytics X Session Capturer loaded');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'captureSession') {
    console.log('📊 Starting session capture for user:', request.userId);
    
    try {
      // Extract session data
      const cookies = {};
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) cookies[name] = value;
      });

      const localStorage = {};
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) localStorage[key] = window.localStorage.getItem(key);
        }
      } catch (e) {
        console.log('localStorage access failed:', e);
      }

      const sessionStorage = {};
      try {
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) sessionStorage[key] = window.sessionStorage.getItem(key);
        }
      } catch (e) {
        console.log('sessionStorage access failed:', e);
      }

      const sessionData = {
        cookies,
        localStorage,
        sessionStorage,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };

      console.log('📊 Session data extracted:', {
        cookieCount: Object.keys(cookies).length,
        localStorageCount: Object.keys(localStorage).length,
        sessionStorageCount: Object.keys(sessionStorage).length
      });

      if (Object.keys(cookies).length === 0) {
        sendResponse({
          success: false,
          error: 'No cookies found. Make sure you are logged into X.com!'
        });
        return;
      }

      // Send to Followlytics API
      fetch('https://followlytics-zeta.vercel.app/api/auth/capture-x-session-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionData,
          userId: request.userId
        }),
      })
      .then(response => response.json())
      .then(data => {
        console.log('📤 API Response:', data);
        
        if (data.success) {
          console.log('✅ Session capture successful!');
          sendResponse({
            success: true,
            message: 'Session captured successfully!'
          });
        } else {
          console.error('❌ API Error:', data.error);
          sendResponse({
            success: false,
            error: data.error || 'API request failed'
          });
        }
      })
      .catch(error => {
        console.error('❌ Network Error:', error);
        sendResponse({
          success: false,
          error: 'Network error: ' + error.message
        });
      });

      // Return true to indicate we'll send response asynchronously
      return true;

    } catch (error) {
      console.error('❌ Capture Error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
});
