import { Daytona } from '@daytonaio/sdk'

// Validate required environment variables
function validateDaytonaConfig() {
  const requiredVars = {
    DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
    DAYTONA_API_URL: process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'
  }

  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.error('Missing Daytona environment variables:', missing)
    console.error('Available env vars:', {
      DAYTONA_API_KEY: !!process.env.DAYTONA_API_KEY,
      DAYTONA_API_URL: !!process.env.DAYTONA_API_URL
    })
    throw new Error(`Missing required Daytona environment variables: ${missing.join(', ')}`)
  }

  console.log('Daytona config validated:', {
    apiKey: requiredVars.DAYTONA_API_KEY?.substring(0, 10) + '...',
    apiUrl: requiredVars.DAYTONA_API_URL
  })

  return requiredVars
}

// Initialize Daytona client with configuration
let daytonaClient: Daytona | null = null

function getDaytonaClient() {
  if (!daytonaClient) {
    try {
      const config = validateDaytonaConfig()
      daytonaClient = new Daytona({
        apiKey: config.DAYTONA_API_KEY!,
        apiUrl: config.DAYTONA_API_URL
      })
    } catch (error) {
      console.error('Failed to initialize Daytona client:', error)
      throw error
    }
  }
  return daytonaClient
}

export interface SandboxConfig {
  name: string
  repository?: string
  image?: string
  envVars?: Record<string, string>
}

export interface FollowerScanResult {
  followers: Array<{
    username: string
    displayName: string
  }>
  followerCount: number
  scanDate: string
  status: string
  username: string
  strategy?: string
  error?: string
  executionTime?: number
}

export class DaytonaSandboxManager {
  private static client = getDaytonaClient()

  static async createSandbox(config: SandboxConfig) {
    console.log('Creating Daytona sandbox with config:', config)
    
    try {
      const sandbox = await this.client.sandbox.create({
        name: config.name,
        repository: config.repository || 'https://github.com/microsoft/vscode-dev-containers',
        image: config.image || 'node:18',
        envVars: config.envVars || {}
      })
      
      console.log('✅ Sandbox created successfully:', sandbox.id)
      return sandbox
    } catch (error) {
      console.error('❌ Failed to create sandbox:', error)
      throw new Error(`Sandbox creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static async setupSandboxEnvironment(sandbox: any) {
    console.log('Setting up sandbox environment...')
    
    try {
      // Install Node.js dependencies
      console.log('Installing Node.js dependencies...')
      await sandbox.process.executeCommand('npm init -y')
      await sandbox.process.executeCommand('npm install playwright puppeteer --save')
      
      // Install Playwright browsers
      console.log('Installing Playwright browsers...')
      await sandbox.process.executeCommand('npx playwright install chromium')
      
      console.log('Sandbox environment setup complete')
    } catch (error) {
      console.error('Failed to setup sandbox environment:', error)
      throw new Error(`Environment setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static async executeFollowerScan(
    sandbox: any,
    username: string,
    accessToken: string,
    accessTokenSecret: string
  ): Promise<FollowerScanResult> {
    console.log(`🚀 Starting multi-browser follower scan for @${username}`)

    // Read the multi-browser scanner script
    const fs = require('fs')
    const path = require('path')
    const scannerScriptPath = path.join(process.cwd(), 'src', 'lib', 'multi-browser-scanner.js')
    
    let scannerScript: string
    try {
      scannerScript = fs.readFileSync(scannerScriptPath, 'utf8')
      console.log('📝 Multi-browser scanner script loaded')
    } catch (error) {
      console.error('❌ Failed to read scanner script:', error)
      throw new Error(`Scanner script not found: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Upload and execute the scanner script using the robust fallback system
    try {
      await this.uploadScriptWithFallback(sandbox, scannerScript, 'twitter-scanner.js')
      console.log('✅ Scanner script uploaded successfully')
    } catch (error) {
      console.error('❌ Failed to upload scanner script:', error)
      throw new Error(`Script upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Set environment variables for the scan
    const envVars = {
      TWITTER_USERNAME: username,
      TWITTER_ACCESS_TOKEN: accessToken,
      TWITTER_ACCESS_TOKEN_SECRET: accessTokenSecret
    }

    console.log('🔧 Setting environment variables...')
    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        await sandbox.process.executeCommand(`export ${key}="${value}"`)
      }
    }

    console.log('🚀 Executing multi-browser Twitter scanner...')
    
    // Execute the scanner with timeout
    const timeoutMs = 10 * 60 * 1000 // 10 minutes
    const startTime = Date.now()
    
    try {
      const result = await Promise.race([
        sandbox.process.executeCommand('node twitter-scanner.js'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Scanner execution timeout')), timeoutMs)
        )
      ])
      
      console.log('✅ Scanner execution completed')
      console.log('📊 Scanner output:', result)
      
    } catch (error) {
      console.error('❌ Scanner execution failed:', error)
      
      // Try to get any partial results
      try {
        const partialResult = await sandbox.process.executeCommand('cat /tmp/followers_result.json 2>/dev/null || echo "{}"')
        console.log('📄 Partial result found:', partialResult)
      } catch (e) {
        console.log('No partial results available')
      }
    }

    // Retrieve the results
    console.log('📥 Retrieving scan results...')
    try {
      const resultContent = await sandbox.process.executeCommand('cat /tmp/followers_result.json')
      const scanResult = JSON.parse(resultContent as string)
      
      console.log('📊 Scan completed successfully:', {
        followerCount: scanResult.followerCount,
        status: scanResult.status,
        strategy: scanResult.strategy || 'unknown'
      })
      
      return scanResult
      
    } catch (error) {
      console.error('❌ Failed to retrieve scan results:', error)
      
      // Return a fallback result
      return {
        followers: [],
        followerCount: 0,
        scanDate: new Date().toISOString(),
        status: 'execution_failed',
        username: username,
        error: `Scanner execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      }
    }
  }

  // Robust script upload with multiple fallback methods
  private static async uploadScriptWithFallback(sandbox: any, scriptContent: string, filename: string): Promise<void> {
    const methods = [
      {
        name: 'Direct file write',
        execute: async () => {
          await sandbox.process.executeCommand(`cat > ${filename} << 'SCRIPT_EOF'\n${scriptContent}\nSCRIPT_EOF`)
        }
      },
      {
        name: 'Base64 upload',
        execute: async () => {
          const base64Content = Buffer.from(scriptContent).toString('base64')
          await sandbox.process.executeCommand(`echo "${base64Content}" | base64 -d > ${filename}`)
        }
      },
      {
        name: 'Echo method',
        execute: async () => {
          // Split into smaller chunks to avoid command line length limits
          const chunks = scriptContent.match(/.{1,1000}/g) || []
          await sandbox.process.executeCommand(`echo -n "" > ${filename}`) // Create empty file
          
          for (const chunk of chunks) {
            const escapedChunk = chunk.replace(/'/g, "'\"'\"'")
            await sandbox.process.executeCommand(`echo -n '${escapedChunk}' >> ${filename}`)
          }
        }
      }
    ]

    for (const method of methods) {
      try {
        console.log(`📤 Trying upload method: ${method.name}`)
        await method.execute()
        
        // Verify the file was created and has content
        const fileCheck = await sandbox.process.executeCommand(`ls -la ${filename} && head -5 ${filename}`)
        console.log(`✅ ${method.name} succeeded:`, fileCheck)
        return
        
      } catch (error) {
        console.log(`❌ ${method.name} failed:`, error)
      }
    }
    
    throw new Error('All upload methods failed')
  }

  static async cleanupSandbox(sandbox: any) {
    try {
      console.log('🧹 Cleaning up sandbox...')
      await this.client.sandbox.delete(sandbox.id)
      console.log('✅ Sandbox cleanup completed')
    } catch (error) {
      console.error('❌ Sandbox cleanup failed:', error)
    }
  }
}

export default DaytonaSandboxManager
