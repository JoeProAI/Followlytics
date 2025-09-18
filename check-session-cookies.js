// Check if session cookies are available for the user
const { adminDb } = require('./src/lib/firebase-admin');

async function checkSessionCookies() {
  try {
    console.log('🔍 Checking for session cookies...');
    
    // You'll need to replace this with your actual user ID
    const userId = 'x_1767231492793434113'; // Your Firebase user ID
    
    const sessionDoc = await adminDb.collection('x_session_cookies').doc(userId).get();
    
    if (!sessionDoc.exists) {
      console.log('❌ No session cookies found');
      console.log('💡 You need to re-authorize Twitter access to capture session cookies');
      return;
    }
    
    const cookies = sessionDoc.data();
    console.log('✅ Session cookies found!');
    console.log('📊 Cookie status:', {
      hasAuthToken: !!cookies.auth_token,
      hasCt0: !!cookies.ct0,
      hasTwid: !!cookies.twid,
      capturedAt: cookies.capturedAt,
      authTokenLength: cookies.auth_token?.length || 0,
      ct0Length: cookies.ct0?.length || 0,
      twidLength: cookies.twid?.length || 0
    });
    
    if (cookies.auth_token) {
      console.log('🎉 Ready for session cookie authentication!');
    } else {
      console.log('⚠️ Missing auth_token - may need to re-authorize');
    }
    
  } catch (error) {
    console.error('❌ Error checking session cookies:', error.message);
  }
}

checkSessionCookies();
