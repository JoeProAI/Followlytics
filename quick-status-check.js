// Quick status check for the current hybrid scan
const https = require('https')

async function checkScanStatus() {
  console.log('🔍 Checking current scan status...')
  
  try {
    // This would normally require authentication, but let's check the public status
    const response = await fetch('https://followlytics-git-main-joeproais-projects.vercel.app/api/scan/monitor', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // You'd need to replace this
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('📊 Scan Status Summary:')
      console.log(`   Active Scans: ${data.summary.activeScans}`)
      console.log(`   Completed Scans: ${data.summary.completedScans}`)
      console.log(`   Authentication Required: ${data.summary.authenticationRequiredScans}`)
      
      if (data.activeScans.length > 0) {
        console.log('\n🔄 Active Scans:')
        data.activeScans.forEach((scan, i) => {
          console.log(`   ${i + 1}. ${scan.xUsername} - Status: ${scan.status}`)
        })
      }
      
      if (data.summary.authenticationRequiredScans > 0) {
        console.log('\n🍪 Scans requiring session cookies found!')
        console.log('   → Go to dashboard and provide session cookies to continue')
      }
    } else {
      console.log('❌ Could not check status (authentication required)')
    }
  } catch (error) {
    console.log('💡 Status check requires authentication - check dashboard directly')
  }
}

checkScanStatus()
