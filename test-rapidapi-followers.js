// Test RapidAPI Twitter Followers endpoint
const https = require('https')

const RAPIDAPI_KEY = '4c7b1afae8msha1e8847276ddffdp127aa5jsn4d6c5f0e1ff0'
const RAPIDAPI_HOST = 'twitter-followers.p.rapidapi.com'
const TEST_USERNAME = 'JoeProAI' // Test with your account

async function testGetFollowers(username, page = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: RAPIDAPI_HOST,
      path: `/${username}/followers?page=${page}`, // Correct path format from docs
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data))
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function getAllFollowers(username) {
  console.log(`🔍 Fetching followers for @${username}...\n`)
  
  let page = 1
  let allFollowers = []
  
  try {
    while (true) {
      console.log(`📄 Fetching page ${page}...`)
      
      const data = await testGetFollowers(username, page)
      
      console.log(`   ✅ Got ${data.followers?.length || 0} followers`)
      
      if (!data.followers || data.followers.length === 0) {
        console.log('\n✅ No more followers to fetch')
        break
      }
      
      allFollowers = [...allFollowers, ...data.followers]
      
      // Show sample of first few followers
      if (page === 1) {
        console.log('\n📊 Sample followers:')
        data.followers.slice(0, 5).forEach((follower, idx) => {
          console.log(`   ${idx + 1}. @${follower.username} - ${follower.name}`)
          console.log(`      Followers: ${follower.followers_count?.toLocaleString() || 'N/A'}`)
          console.log(`      Bio: ${follower.description?.substring(0, 60) || 'N/A'}...`)
        })
      }
      
      page++
      
      // Rate limit: 1 request per second on free tier
      console.log('   ⏳ Waiting 1 second (rate limit)...')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('\n' + '='.repeat(50))
    console.log(`🎉 TOTAL FOLLOWERS: ${allFollowers.length}`)
    console.log('='.repeat(50))
    
    // Show data structure
    if (allFollowers.length > 0) {
      console.log('\n📋 Available data per follower:')
      const sample = allFollowers[0]
      console.log(JSON.stringify(sample, null, 2))
    }
    
    return allFollowers
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    throw error
  }
}

// Run test
console.log('🚀 Testing RapidAPI Twitter Followers Endpoint\n')
getAllFollowers(TEST_USERNAME)
  .then(followers => {
    console.log('\n✅ Test successful!')
    console.log(`📊 Retrieved ${followers.length} followers for @${TEST_USERNAME}`)
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error)
  })
