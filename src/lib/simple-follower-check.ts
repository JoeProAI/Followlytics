/**
 * SIMPLE Follower Count Checker
 * Just gets the follower count for spam protection
 * Uses free/cheap methods - NOT for extraction!
 */

export async function getFollowerCount(username: string): Promise<number | null> {
  const cleanUsername = username.replace('@', '')
  
  console.log(`[SimpleCheck] Getting follower count for @${cleanUsername}`)
  
  // Method 1: Try nitter (free X frontend)
  try {
    console.log('[SimpleCheck] Trying nitter.net...')
    const nitterUrl = `https://nitter.net/${cleanUsername}`
    const response = await fetch(nitterUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (response.ok) {
      const html = await response.text()
      
      // Look for follower count in HTML
      const patterns = [
        /class="profile-stat-num">([0-9,]+)<\/span>\s*<span class="profile-stat-header">Followers/i,
        /([0-9,]+)\s*Followers/i,
        /<span class="profile-stat-num">([0-9,.]+[KMB]?)<\/span>/i
      ]
      
      for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match) {
          let countStr = match[1].replace(/,/g, '')
          let count = 0
          
          // Handle K, M, B notation
          if (countStr.includes('K')) {
            count = Math.round(parseFloat(countStr) * 1000)
          } else if (countStr.includes('M')) {
            count = Math.round(parseFloat(countStr) * 1000000)
          } else if (countStr.includes('B')) {
            count = Math.round(parseFloat(countStr) * 1000000000)
          } else {
            count = parseInt(countStr)
          }
          
          if (!isNaN(count) && count >= 0) {
            console.log(`[SimpleCheck] ✅ @${cleanUsername} has ${count} followers (from nitter)`)
            return count
          }
        }
      }
    }
  } catch (error) {
    console.log('[SimpleCheck] Nitter failed, trying next method...')
  }
  
  // Method 2: Try syndication.twitter.com (public endpoint)
  try {
    console.log('[SimpleCheck] Trying Twitter syndication API...')
    const syndicationUrl = `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${cleanUsername}`
    const response = await fetch(syndicationUrl)
    
    if (response.ok) {
      const data = await response.json()
      if (data && data[0] && data[0].followers_count !== undefined) {
        const count = data[0].followers_count
        console.log(`[SimpleCheck] ✅ @${cleanUsername} has ${count} followers (from syndication API)`)
        return count
      }
    }
  } catch (error) {
    console.log('[SimpleCheck] Syndication API failed, trying next method...')
  }
  
  // Method 3: Try tweeterid.com API (free)
  try {
    console.log('[SimpleCheck] Trying tweeterid.com API...')
    const response = await fetch(`https://tweeterid.com/ajax.php?username=${cleanUsername}`)
    
    if (response.ok) {
      const html = await response.text()
      // This API returns HTML with user ID - we can extract from their page
      const idMatch = html.match(/id=(\d+)/)
      if (idMatch) {
        const userId = idMatch[1]
        console.log(`[SimpleCheck] Got user ID: ${userId}`)
        
        // Now fetch profile with user ID
        const profileResponse = await fetch(`https://cdn.syndication.twimg.com/widgets/followbutton/info.json?user_ids=${userId}`)
        if (profileResponse.ok) {
          const data = await profileResponse.json()
          if (data && data[0] && data[0].followers_count !== undefined) {
            const count = data[0].followers_count
            console.log(`[SimpleCheck] ✅ @${cleanUsername} has ${count} followers (from user ID lookup)`)
            return count
          }
        }
      }
    }
  } catch (error) {
    console.log('[SimpleCheck] TweeterId method failed...')
  }
  
  console.error('[SimpleCheck] ❌ All methods failed to get follower count')
  return null
}
