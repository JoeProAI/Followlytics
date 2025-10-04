/**
 * Grant Beta Access Script
 * 
 * Usage:
 * 1. Get your Firebase ID token from browser console:
 *    - Login to Followlytics
 *    - Open browser console
 *    - Run: firebase.auth().currentUser.getIdToken().then(t => console.log(t))
 * 2. Run this script with your token and target user ID
 * 
 * Example:
 * node scripts/grant-beta-access.js YOUR_TOKEN TARGET_USER_ID true
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function grantBetaAccess(token: string, userId: string, grant: boolean) {
  try {
    const response = await fetch(`${API_URL}/api/admin/beta-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        betaAccess: grant
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Error:', data.error || data.details)
      process.exit(1)
    }

    console.log('✅ Success:', data.message)
    console.log('User ID:', data.userId)
    console.log('Beta Access:', data.betaAccess)
  } catch (error) {
    console.error('❌ Failed:', error)
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
if (args.length < 3) {
  console.log('Usage: ts-node grant-beta-access.ts <TOKEN> <USER_ID> <true|false>')
  console.log('')
  console.log('Example:')
  console.log('ts-node grant-beta-access.ts eyJhbGc... nLhtKGD9fQhpFFwWmCl5wAY0yZe2 true')
  process.exit(1)
}

const [token, userId, grantStr] = args
const grant = grantStr.toLowerCase() === 'true'

grantBetaAccess(token, userId, grant)
