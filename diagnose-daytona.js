// Diagnose Daytona Integration Issues

const { Daytona } = require('@daytonaio/sdk')

async function diagnoseDaytona() {
  console.log('🔍 Diagnosing Daytona Integration...\n')

  // Check environment variables
  console.log('1. Environment Variables:')
  console.log('   DAYTONA_API_KEY:', process.env.DAYTONA_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('   DAYTONA_API_URL:', process.env.DAYTONA_API_URL || '❌ Not set')
  console.log('')

  if (!process.env.DAYTONA_API_KEY) {
    console.log('❌ DAYTONA_API_KEY is not set. Cannot proceed.')
    console.log('   Add it to your .env.local file')
    return
  }

  try {
    // Initialize Daytona client
    console.log('2. Initializing Daytona Client...')
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      apiUrl: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
    })
    console.log('   ✅ Client initialized\n')

    // List existing sandboxes
    console.log('3. Listing Active Sandboxes...')
    try {
      const sandboxes = await daytona.list()
      console.log(`   Found ${sandboxes?.length || 0} sandboxes:`)
      
      if (sandboxes && sandboxes.length > 0) {
        sandboxes.forEach((sb, idx) => {
          console.log(`   ${idx + 1}. ID: ${sb.id}`)
          console.log(`      State: ${sb.state}`)
          console.log(`      Created: ${sb.createdAt || 'Unknown'}`)
        })
      } else {
        console.log('   ⚠️  No active sandboxes found')
      }
    } catch (listError) {
      console.log('   ❌ Failed to list sandboxes:', listError.message)
    }
    console.log('')

    // Test creating a sandbox
    console.log('4. Testing Sandbox Creation...')
    try {
      const testSandbox = await daytona.create({
        language: 'javascript',
        name: 'diagnostic-test'
      })
      console.log('   ✅ Test sandbox created:', testSandbox.id)
      console.log('      State:', testSandbox.state)
      
      // Wait a bit for it to start
      console.log('   ⏳ Waiting for sandbox to start...')
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Check status
      const status = await daytona.get(testSandbox.id)
      console.log('   📊 Sandbox status:', status?.state)
      
      // Cleanup
      console.log('   🧹 Cleaning up test sandbox...')
      await daytona.destroy(testSandbox.id)
      console.log('   ✅ Test sandbox destroyed')
      
    } catch (createError) {
      console.log('   ❌ Failed to create/test sandbox:', createError.message)
      console.log('      Details:', createError)
    }
    console.log('')

    console.log('✅ Diagnosis Complete!')
    console.log('\nRECOMMENDATIONS:')
    console.log('1. If sandboxes are created but stuck "stopping", they may have auto-stopped')
    console.log('2. Check Daytona dashboard: https://app.daytona.io')
    console.log('3. Verify API key has correct permissions')
    console.log('4. Check Vercel logs for errors during scan execution')

  } catch (error) {
    console.log('\n❌ CRITICAL ERROR:', error.message)
    console.log('   Full error:', error)
    console.log('\nLikely issues:')
    console.log('- Invalid API key')
    console.log('- Network connectivity problem')
    console.log('- Daytona service down')
  }
}

// Run diagnosis
diagnoseDaytona().catch(console.error)
