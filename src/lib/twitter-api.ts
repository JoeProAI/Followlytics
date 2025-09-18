import crypto from 'crypto'

interface TwitterApiCredentials {
  accessToken: string
  accessTokenSecret: string
  consumerKey?: string
  consumerSecret?: string
}

export class TwitterApiClient {
  private credentials: TwitterApiCredentials

  constructor(credentials: TwitterApiCredentials) {
    this.credentials = {
      ...credentials,
      consumerKey: credentials.consumerKey || process.env.TWITTER_CONSUMER_KEY || '',
      consumerSecret: credentials.consumerSecret || process.env.TWITTER_CONSUMER_SECRET || ''
    }
  }

  // Generate OAuth 1.0a signature
  private generateOAuthSignature(method: string, url: string, params: Record<string, string>): string {
    const consumerSecret = this.credentials.consumerSecret + '&' + this.credentials.accessTokenSecret
    
    // Create parameter string
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    
    // Create signature base string
    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams)
    ].join('&')
    
    // Generate signature
    const signature = crypto
      .createHmac('sha1', consumerSecret)
      .update(signatureBaseString)
      .digest('base64')
    
    return signature
  }

  // Generate OAuth authorization header
  private generateOAuthHeader(method: string, url: string, additionalParams: Record<string, string> = {}): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.credentials.consumerKey!,
      oauth_token: this.credentials.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_version: '1.0',
      ...additionalParams
    }

    // Generate signature
    const signature = this.generateOAuthSignature(method, url, oauthParams)
    oauthParams.oauth_signature = signature

    // Create authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ')

    return authHeader
  }

  // Get user information
  async getUserInfo(screenName?: string): Promise<any> {
    const url = 'https://api.twitter.com/1.1/users/show.json'
    const params: Record<string, string> = screenName ? { screen_name: screenName } : {}
    
    const queryString = Object.keys(params).length > 0 ? new URLSearchParams(params).toString() : ''
    const fullUrl = queryString ? `${url}?${queryString}` : url
    
    const authHeader = this.generateOAuthHeader('GET', url, params)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Twitter API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // Get followers (requires appropriate API access level)
  async getFollowers(screenName: string, cursor?: string): Promise<any> {
    const url = 'https://api.twitter.com/1.1/followers/list.json'
    const params: Record<string, string> = {
      screen_name: screenName,
      count: '200', // Maximum per request
      include_user_entities: 'false'
    }
    
    if (cursor) {
      params.cursor = cursor
    }
    
    const queryString = new URLSearchParams(params).toString()
    const fullUrl = `${url}?${queryString}`
    
    const authHeader = this.generateOAuthHeader('GET', url, params)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Twitter API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // Test API access
  async testApiAccess(): Promise<{ success: boolean; error?: string; userInfo?: any }> {
    try {
      const userInfo = await this.getUserInfo()
      return { success: true, userInfo }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

// Helper function to create Twitter API client from stored tokens
export async function createTwitterApiClient(userId: string): Promise<TwitterApiClient> {
  const { adminDb } = await import('@/lib/firebase-admin')
  
  const tokensDoc = await adminDb.collection('x_tokens').doc(userId).get()
  if (!tokensDoc.exists) {
    throw new Error('No Twitter tokens found for user')
  }
  
  const tokens = tokensDoc.data()
  return new TwitterApiClient({
    accessToken: tokens?.accessToken,
    accessTokenSecret: tokens?.accessTokenSecret
  })
}
