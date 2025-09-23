'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function XSessionCaptureSimplified() {
  const { user } = useAuth()
  const [sessionStatus, setSessionStatus] = useState<'none' | 'captured' | 'expired'>('none')
  const [loading, setLoading] = useState(true)

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

  const startCapture = () => {
    // Open X.com directly and show instructions
    window.open('https://x.com', '_blank')
    
    // Show instructions
    alert(`
🔐 X Session Capture Instructions:

1. Login to X.com in the new tab that just opened
2. Once logged in, copy this code and paste it in the browser console (F12):

javascript:(function(){
  const cookies={};
  document.cookie.split(';').forEach(cookie=>{
    const[name,value]=cookie.trim().split('=');
    if(name&&value)cookies[name]=value;
  });
  
  const localStorage={};
  for(let i=0;i<window.localStorage.length;i++){
    const key=window.localStorage.key(i);
    localStorage[key]=window.localStorage.getItem(key);
  }
  
  const sessionData={cookies,localStorage,userAgent:navigator.userAgent,url:window.location.href};
  
  fetch('https://followlytics-zeta.vercel.app/api/auth/capture-x-session-direct',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({sessionData,userId:'${user?.uid}'})
  })
  .then(r=>r.json())
  .then(d=>{
    if(d.success){
      alert('✅ Session captured! Return to Followlytics.');
    }else{
      alert('❌ Failed: '+d.error);
    }
  })
  .catch(e=>alert('❌ Error: '+e.message));
})();

3. Press Enter to run the code
4. You should see "✅ Session captured!" message
5. Return to this dashboard

Would you like to try this method?
    `)
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
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-orange-800">
            🔐 X Session Required (Temporary Workaround)
          </h3>
          <p className="text-sm text-orange-700 mt-1">
            Due to browser security, we need a simple workaround. Click below for instructions.
          </p>
        </div>
        <button
          onClick={startCapture}
          className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded transition-colors"
        >
          📋 Get Instructions
        </button>
      </div>
      
      <div className="mt-3 p-3 bg-white border border-orange-200 rounded">
        <p className="text-sm text-orange-800">
          <strong>Quick Summary:</strong>
        </p>
        <ol className="text-sm text-orange-700 mt-1 list-decimal list-inside space-y-1">
          <li>Click "Get Instructions" above</li>
          <li>Login to X.com in the new tab</li>
          <li>Copy & paste the provided code in browser console</li>
          <li>Return here - session will be captured!</li>
        </ol>
        <p className="text-xs text-orange-600 mt-2">
          This is a temporary workaround while we improve the automated capture system.
        </p>
      </div>
    </div>
  )
}
