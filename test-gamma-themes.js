// Test script to fetch available Gamma themes
require('dotenv').config({ path: '.env.local' })

async function testGammaThemes() {
  const apiKey = process.env.GAMMA_API_KEY
  
  if (!apiKey) {
    console.error('❌ GAMMA_API_KEY not found in environment')
    return
  }

  console.log('🔑 Using API key:', apiKey.substring(0, 15) + '...')
  console.log('\n📋 Fetching Gamma themes...\n')

  try {
    const response = await fetch('https://public-api.gamma.app/v1.0/themes', {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json'
      }
    })

    console.log('Status:', response.status, response.statusText)

    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ API Error:', data)
      return
    }

    console.log('\n✅ Themes Response:\n')
    console.log(JSON.stringify(data, null, 2))

    // Extract theme IDs and names
    if (data.data && Array.isArray(data.data)) {
      console.log('\n📝 Available Theme IDs:\n')
      data.data.forEach(theme => {
        console.log(`  • ID: "${theme.id}"`)
        console.log(`    Name: ${theme.name}`)
        console.log(`    Type: ${theme.type}`)
        if (theme.colorKeywords) {
          console.log(`    Colors: ${theme.colorKeywords.join(', ')}`)
        }
        if (theme.toneKeywords) {
          console.log(`    Tone: ${theme.toneKeywords.join(', ')}`)
        }
        console.log('')
      })

      console.log('\n🎨 Copy this array for code:\n')
      const themeIds = data.data.map(t => t.id)
      console.log('const gammaThemes = ' + JSON.stringify(themeIds, null, 2))
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testGammaThemes()
