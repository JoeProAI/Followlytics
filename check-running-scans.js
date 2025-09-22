// Check what scans are currently running and their status
async function checkRunningScans() {
  console.log('🔍 Checking running scans and sandboxes...');
  
  try {
    // This would normally require authentication, but let's create a simple status check
    const response = await fetch('https://followlytics-zeta.vercel.app/api/scan/monitor', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Scan Monitor Results:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Monitor endpoint requires authentication');
      console.log('Response status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error checking scans:', error.message);
  }
  
  console.log('\n🔧 DIAGNOSIS:');
  console.log('1. Check if there are active sandboxes running in background');
  console.log('2. Verify if authorization popup was blocked by browser');
  console.log('3. Confirm if new 7-step method is being used');
  console.log('4. Look for any stuck processes that need cleanup');
}

checkRunningScans();
