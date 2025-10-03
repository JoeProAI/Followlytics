import OAuth from 'oauth-1.0a'
import crypto from 'crypto'

// X OAuth 1.0a configuration
const oauth = new OAuth({
  consumer: {
    key: process.env.X_API_KEY!,
    secret: process.env.X_API_SECRET!,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string: string, key: string) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64')
  },
})

export interface XTokens {
  oauth_token: string
  oauth_token_secret: string
}

export interface XUser {
  id: string
  name: string
  screen_name: string
  profile_image_url?: string
  followers_count?: number
  friends_count?: number
}

export class XAuth {
  private static readonly REQUEST_TOKEN_URL = 'https://api.x.com/oauth/request_token'
  private static readonly AUTHORIZE_URL = 'https://api.x.com/oauth/authorize'
  private static readonly ACCESS_TOKEN_URL = 'https://api.x.com/oauth/access_token'
  private static readonly VERIFY_CREDENTIALS_URL = 'https://api.x.com/1.1/account/verify_credentials.json'

  /**
   * Step 1: Get request token
   */
  static async getRequestToken(callbackUrl: string): Promise<XTokens> {
    const requestData = {
      url: this.REQUEST_TOKEN_URL,
      method: 'POST',
      data: {
        oauth_callback: callbackUrl,
      },
    }

    const authHeader = oauth.toHeader(oauth.authorize(requestData))

    const response = await fetch(this.REQUEST_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': authHeader.Authorization,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        oauth_callback: callbackUrl,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get request token: ${response.statusText}`)
    }

    const responseText = await response.text()
    const params = new URLSearchParams(responseText)
    
    return {
      oauth_token: params.get('oauth_token')!,
      oauth_token_secret: params.get('oauth_token_secret')!,
    }
  }

  /**
   * Step 2: Generate authorization URL
   */
  static getAuthorizationUrl(oauthToken: string): string {
    return `https://api.x.com/oauth/authorize?oauth_token=${oauthToken}`
  }

  /**
   * Step 3: Exchange request token for access token
   */
  static async getAccessToken(
    oauthToken: string,
    oauthTokenSecret: string,
    oauthVerifier: string
  ): Promise<XTokens & { user_id: string; screen_name: string }> {
    const requestData = {
      url: this.ACCESS_TOKEN_URL,
      method: 'POST',
      data: {
        oauth_verifier: oauthVerifier,
      },
    }

    const token = {
      key: oauthToken,
      secret: oauthTokenSecret,
    }

    const authHeader = oauth.toHeader(oauth.authorize(requestData, token))

    const response = await fetch(this.ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': authHeader.Authorization,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        oauth_verifier: oauthVerifier,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`)
    }

    const responseText = await response.text()
    const params = new URLSearchParams(responseText)
    
    return {
      oauth_token: params.get('oauth_token')!,
      oauth_token_secret: params.get('oauth_token_secret')!,
      user_id: params.get('user_id')!,
      screen_name: params.get('screen_name')!,
    }
  }

  /**
   * Verify credentials and get user info
   */
  static async verifyCredentials(
    accessToken: string,
    accessTokenSecret: string
  ): Promise<XUser> {
    const requestData = {
      url: this.VERIFY_CREDENTIALS_URL,
      method: 'GET',
    }

    const token = {
      key: accessToken,
      secret: accessTokenSecret,
    }

    const authHeader = oauth.toHeader(oauth.authorize(requestData, token))

    const response = await fetch(this.VERIFY_CREDENTIALS_URL, {
      method: 'GET',
      headers: {
        'Authorization': authHeader.Authorization,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to verify credentials: ${response.statusText}`)
    }

    const user = await response.json()
    
    return {
      id: user.id_str,
      screen_name: user.screen_name,
      name: user.name,
      followers_count: user.followers_count,
      friends_count: user.friends_count,
    }
  }

  /**
   * Make authenticated API request
   */
  static async makeAuthenticatedRequest(
    url: string,
    method: 'GET' | 'POST',
    accessToken: string,
    accessTokenSecret: string,
    params?: Record<string, string>
  ): Promise<Response> {
    const requestData = {
      url,
      method,
      data: params || {},
    }

    const token = {
      key: accessToken,
      secret: accessTokenSecret,
    }

    const authHeader = oauth.toHeader(oauth.authorize(requestData, token))

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': authHeader.Authorization,
      },
    }

    if (method === 'POST' && params) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
      fetchOptions.body = new URLSearchParams(params)
    } else if (method === 'GET' && params) {
      const urlWithParams = new URL(url)
      Object.entries(params).forEach(([key, value]) => {
        urlWithParams.searchParams.append(key, value)
      })
      url = urlWithParams.toString()
    }

    return fetch(url, fetchOptions)
  }
}
