import { Daytona } from '@daytonaio/sdk'

export interface OptimizedSandboxConfig {
  name: string
  userId: string
  scanType: 'small' | 'medium' | 'large' | 'enterprise'
  twitterTokens: {
    access_token: string
    access_token_secret: string
    bearer_token?: string
  }
  maxFollowers?: number
  timeoutDisabled?: boolean
  useSnapshot?: boolean
}

export class OptimizedDaytonaSandboxManager {
  private static daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY!
  })

  /**
   * Create optimized sandbox using the working Daytona pattern
   */
  static async createOptimizedSandbox(config: OptimizedSandboxConfig) {
    try {
      console.log(`🚀 Creating optimized sandbox for ${config.scanType} scan...`)
      
      // Use the same pattern as the working DaytonaSandboxManager
      const sandbox = await this.daytona.create({
        language: 'javascript' as const,
        envVars: {
          // Twitter Authentication
          TWITTER_ACCESS_TOKEN: config.twitterTokens.access_token,
          TWITTER_ACCESS_TOKEN_SECRET: config.twitterTokens.access_token_secret,
          TWITTER_BEARER_TOKEN: config.twitterTokens.bearer_token || '',
          
          // Scan Configuration
          SCAN_TYPE: config.scanType,
          MAX_FOLLOWERS: config.maxFollowers?.toString() || '10000',
          USER_ID: config.userId,
          
          // Performance Optimizations
          NODE_OPTIONS: '--max-old-space-size=4096',
          PUPPETEER_ARGS: '--memory-pressure-off --max_old_space_size=4096',
          
          // Feature Flags
          TIMEOUT_DISABLED: config.timeoutDisabled ? 'true' : 'false',
          USE_SNAPSHOT: config.useSnapshot ? 'true' : 'false',
          OPTIMIZATION_LEVEL: config.scanType
        }
      })
      
      console.log(`✅ Optimized sandbox created: ${sandbox.id}`)
      console.log(`📊 Scan type: ${config.scanType}`)
      console.log(`⚡ Optimizations: timeout=${config.timeoutDisabled}, snapshot=${config.useSnapshot}`)
      
      return sandbox

    } catch (error: any) {
      console.error('❌ Failed to create optimized sandbox:', error)
      throw new Error(`Sandbox creation failed: ${error.message}`)
    }
  }
}

export default OptimizedDaytonaSandboxManager
