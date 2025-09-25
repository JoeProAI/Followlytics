/**
 * 🚀 Advanced Daytona Integration Example
 * 
 * This example demonstrates all advanced Daytona features:
 * - Timeout suspension for long operations
 * - Snapshot support for faster startup
 * - Performance optimization by workload
 * - Comprehensive error handling
 * - Production-ready monitoring
 */

import { Daytona } from '@daytonaio/sdk'
import { NextRequest, NextResponse } from 'next/server'

// ===== INTERFACES =====

interface AdvancedScanConfig {
  // Core Configuration
  targetUsername: string
  userId: string
  scanType: 'small' | 'medium' | 'large' | 'enterprise'
  
  // Authentication
  authTokens: {
    access_token: string
    access_token_secret: string
    bearer_token?: string
  }
  
  // Advanced Features
  timeoutDisabled?: boolean    // For operations >30 minutes
  useSnapshot?: boolean        // Pre-configured environments
  enableMonitoring?: boolean   // Resource usage tracking
  retryOnFailure?: boolean     // Automatic retry with optimization
  
  // Performance Tuning
  maxFollowers?: number
  concurrency?: number
  batchSize?: number
}

interface ScanResult {
  status: 'completed' | 'failed' | 'timeout' | 'partial'
  followers: string[]
  totalFollowers: number
  executionTime: number
  resourceUsage: {
    memory: string
    cpu: string
    duration: string
  }
  optimizations: {
    timeoutDisabled: boolean
    snapshotUsed: boolean
    performanceLevel: string
  }
  metadata: {
    sandboxId: string
    attempts: number
    errors: string[]
  }
}

// ===== PERFORMANCE CONFIGURATIONS =====

const PERFORMANCE_CONFIGS = {
  small: {
    nodeOptions: '--max-old-space-size=2048',
    puppeteerArgs: '--memory-pressure-off',
    concurrency: 1,
    batchSize: 100,
    estimatedTime: 2 * 60 * 1000,      // 2 minutes
    timeoutDisabled: false,
    useSnapshot: true
  },
  
  medium: {
    nodeOptions: '--max-old-space-size=4096',
    puppeteerArgs: '--memory-pressure-off --max_old_space_size=4096',
    concurrency: 2,
    batchSize: 500,
    estimatedTime: 15 * 60 * 1000,     // 15 minutes
    timeoutDisabled: true,              // ⭐ Enable for longer operations
    useSnapshot: true
  },
  
  large: {
    nodeOptions: '--max-old-space-size=8192',
    puppeteerArgs: '--memory-pressure-off --max_old_space_size=8192 --disable-dev-shm-usage',
    concurrency: 3,
    batchSize: 1000,
    estimatedTime: 45 * 60 * 1000,     // 45 minutes
    timeoutDisabled: true,              // ⭐ Required for large datasets
    useSnapshot: true
  },
  
  enterprise: {
    nodeOptions: '--max-old-space-size=16384',
    puppeteerArgs: '--memory-pressure-off --max_old_space_size=16384 --disable-dev-shm-usage --no-sandbox',
    concurrency: 5,
    batchSize: 2000,
    estimatedTime: 120 * 60 * 1000,    // 2 hours
    timeoutDisabled: true,              // ⭐ Essential for enterprise scale
    useSnapshot: true
  }
}

// ===== MAIN IMPLEMENTATION =====

export class AdvancedDaytonaManager {
  private static daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY!,
    apiUrl: process.env.DAYTONA_API_URL!
    // ⚠️ DO NOT add orgId or target - causes "No available runners" errors
  })

  /**
   * 🚀 Execute advanced scan with all features
   */
  static async executeAdvancedScan(config: AdvancedScanConfig): Promise<ScanResult> {
    const startTime = Date.now()
    const performanceConfig = PERFORMANCE_CONFIGS[config.scanType]
    let sandbox: any
    let attempts = 0
    const errors: string[] = []

    try {
      // ⭐ STEP 1: Create optimized sandbox with retry logic
      sandbox = await this.createOptimizedSandbox(config, performanceConfig)
      
      // ⭐ STEP 2: Setup environment (with snapshot support)
      const setupResult = await this.setupEnvironment(sandbox, config, performanceConfig)
      console.log(`✅ Environment setup: ${setupResult.message}`)
      
      // ⭐ STEP 3: Execute scan with timeout control
      const scanResult = await this.executeScanWithTimeoutControl(sandbox, config, performanceConfig)
      
      // ⭐ STEP 4: Monitor resources (if enabled)
      const resourceUsage = config.enableMonitoring 
        ? await this.monitorResources(sandbox)
        : { memory: 'N/A', cpu: 'N/A', duration: 'N/A' }
      
      // ⭐ STEP 5: Cleanup
      await this.gracefulCleanup(sandbox)
      
      return {
        status: 'completed',
        followers: scanResult.followers,
        totalFollowers: scanResult.followers.length,
        executionTime: Date.now() - startTime,
        resourceUsage,
        optimizations: {
          timeoutDisabled: config.timeoutDisabled || performanceConfig.timeoutDisabled,
          snapshotUsed: config.useSnapshot ?? performanceConfig.useSnapshot,
          performanceLevel: config.scanType
        },
        metadata: {
          sandboxId: sandbox.id,
          attempts: attempts + 1,
          errors
        }
      }
      
    } catch (error: any) {
      errors.push(error.message)
      
      // ⭐ RETRY LOGIC with optimization
      if (config.retryOnFailure && attempts < 3) {
        console.log(`🔄 Retrying with optimized configuration...`)
        
        const optimizedConfig = await this.optimizeConfigForRetry(config, error)
        return this.executeAdvancedScan(optimizedConfig)
      }
      
      throw new Error(`Advanced scan failed after ${attempts + 1} attempts: ${errors.join(', ')}`)
    }
  }

  /**
   * 🏗️ Create optimized sandbox with advanced features
   */
  private static async createOptimizedSandbox(
    config: AdvancedScanConfig, 
    performanceConfig: any
  ) {
    const maxAttempts = 3
    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🚀 Creating optimized sandbox (attempt ${attempt}/${maxAttempts})...`)
        
        const sandbox = await this.daytona.create({
          language: 'javascript' as const,
          envVars: {
            // ⭐ AUTHENTICATION
            TWITTER_ACCESS_TOKEN: config.authTokens.access_token,
            TWITTER_ACCESS_TOKEN_SECRET: config.authTokens.access_token_secret,
            TWITTER_BEARER_TOKEN: config.authTokens.bearer_token || '',
            
            // ⭐ SCAN CONFIGURATION
            TARGET_USERNAME: config.targetUsername,
            SCAN_TYPE: config.scanType,
            MAX_FOLLOWERS: config.maxFollowers?.toString() || '10000',
            USER_ID: config.userId,
            
            // ⭐ ADVANCED FEATURES
            TIMEOUT_DISABLED: (config.timeoutDisabled ?? performanceConfig.timeoutDisabled) ? 'true' : 'false',
            USE_SNAPSHOT: (config.useSnapshot ?? performanceConfig.useSnapshot) ? 'true' : 'false',
            ENABLE_MONITORING: config.enableMonitoring ? 'true' : 'false',
            
            // ⭐ PERFORMANCE OPTIMIZATION
            NODE_OPTIONS: performanceConfig.nodeOptions,
            PUPPETEER_ARGS: performanceConfig.puppeteerArgs,
            CONCURRENCY: (config.concurrency || performanceConfig.concurrency).toString(),
            BATCH_SIZE: (config.batchSize || performanceConfig.batchSize).toString(),
            
            // ⭐ METADATA
            OPTIMIZATION_LEVEL: config.scanType,
            CREATED_AT: new Date().toISOString(),
            ATTEMPT_NUMBER: attempt.toString(),
            ESTIMATED_DURATION: performanceConfig.estimatedTime.toString()
          }
        })
        
        console.log(`✅ Optimized sandbox created: ${sandbox.id}`)
        console.log(`⚡ Features: timeout=${config.timeoutDisabled ?? performanceConfig.timeoutDisabled}, snapshot=${config.useSnapshot ?? performanceConfig.useSnapshot}`)
        
        return sandbox
        
      } catch (error: any) {
        lastError = error
        console.error(`❌ Sandbox creation attempt ${attempt} failed:`, error.message)
        
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
          console.log(`⏳ Retrying in ${delay/1000} seconds...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw new Error(`Failed to create sandbox after ${maxAttempts} attempts: ${lastError!.message}`)
  }

  /**
   * ⚙️ Setup environment with snapshot support
   */
  private static async setupEnvironment(
    sandbox: any, 
    config: AdvancedScanConfig, 
    performanceConfig: any
  ) {
    const useSnapshot = config.useSnapshot ?? performanceConfig.useSnapshot
    
    try {
      if (useSnapshot) {
        console.log(`⚡ Using SNAPSHOT environment for faster startup...`)
        
        // ⭐ VERIFY SNAPSHOT ENVIRONMENT
        const verifyResult = await sandbox.process.executeCommand('node -e "console.log(require(\'puppeteer\').version)"')
        
        if (verifyResult.result.includes('Cannot find module')) {
          console.log('⚠️ Snapshot missing dependencies, falling back to fresh install')
          return this.setupFreshEnvironment(sandbox, performanceConfig)
        } else {
          console.log(`✅ Snapshot verified: Puppeteer ${verifyResult.result.trim()}`)
          return {
            status: 'ready',
            message: `Snapshot environment loaded (${verifyResult.result.trim()})`,
            setupTime: '30 seconds',
            method: 'snapshot'
          }
        }
      } else {
        return this.setupFreshEnvironment(sandbox, performanceConfig)
      }
    } catch (error: any) {
      console.error('❌ Snapshot setup failed, falling back to fresh install:', error.message)
      return this.setupFreshEnvironment(sandbox, performanceConfig)
    }
  }

  /**
   * 🔧 Setup fresh environment with all dependencies
   */
  private static async setupFreshEnvironment(sandbox: any, performanceConfig: any) {
    console.log(`⚙️ Setting up FRESH environment with optimized dependencies...`)
    
    try {
      // ⭐ INITIALIZE NPM
      await sandbox.process.executeCommand('npm --version')
      await sandbox.process.executeCommand('npm init -y')
      
      // ⭐ INSTALL OPTIMIZED DEPENDENCIES
      console.log('📦 Installing optimized dependencies...')
      const installResult = await sandbox.process.executeCommand(`
        npm install puppeteer playwright-core chromium --verbose --production
      `)
      
      // ⭐ VERIFY INSTALLATION
      const verifyResult = await sandbox.process.executeCommand('node -e "console.log(require(\'puppeteer\').version)"')
      
      if (verifyResult.result.includes('Cannot find module')) {
        throw new Error('Dependency installation verification failed')
      }
      
      console.log(`✅ Fresh environment ready: Puppeteer ${verifyResult.result.trim()}`)
      
      return {
        status: 'ready',
        message: `Fresh environment configured (Puppeteer ${verifyResult.result.trim()})`,
        setupTime: '5 minutes',
        method: 'fresh_install'
      }
      
    } catch (error: any) {
      throw new Error(`Fresh environment setup failed: ${error.message}`)
    }
  }

  /**
   * 🚀 Execute scan with timeout control
   */
  private static async executeScanWithTimeoutControl(
    sandbox: any,
    config: AdvancedScanConfig,
    performanceConfig: any
  ) {
    const timeoutDisabled = config.timeoutDisabled ?? performanceConfig.timeoutDisabled
    
    try {
      // ⭐ GENERATE OPTIMIZED EXTRACTION SCRIPT
      const extractionScript = this.generateAdvancedExtractionScript(config, performanceConfig)
      
      // ⭐ DEPLOY SCRIPT
      await sandbox.process.executeCommand(`cat > /tmp/advanced_extraction.js << 'EOF'
${extractionScript}
EOF`)
      
      // ⭐ EXECUTE WITH TIMEOUT CONTROL
      console.log(`🚀 Executing scan with timeout ${timeoutDisabled ? 'DISABLED' : 'ENABLED'}...`)
      
      const executionOptions = timeoutDisabled 
        ? { timeout: 0 }  // ⭐ UNLIMITED TIMEOUT
        : { timeout: 30 * 60 * 1000 }  // 30 minutes
      
      const extractionResult = await sandbox.process.executeCommand(
        'node /tmp/advanced_extraction.js',
        executionOptions
      )
      
      // ⭐ PARSE RESULTS
      return this.parseAdvancedResults(extractionResult.result, config)
      
    } catch (error: any) {
      if (error.message.includes('timeout')) {
        console.log('⏰ Timeout detected - consider enabling timeout suspension')
      }
      throw error
    }
  }

  /**
   * 📊 Monitor resource usage
   */
  private static async monitorResources(sandbox: any) {
    try {
      const memoryResult = await sandbox.process.executeCommand('free -h | grep Mem')
      const cpuResult = await sandbox.process.executeCommand('top -bn1 | grep "Cpu(s)"')
      const uptimeResult = await sandbox.process.executeCommand('uptime')
      
      return {
        memory: memoryResult.result.trim(),
        cpu: cpuResult.result.trim(),
        duration: uptimeResult.result.trim()
      }
    } catch (error) {
      return {
        memory: 'monitoring_failed',
        cpu: 'monitoring_failed', 
        duration: 'monitoring_failed'
      }
    }
  }

  /**
   * 🧹 Graceful cleanup
   */
  private static async gracefulCleanup(sandbox: any) {
    try {
      console.log('🧹 Performing graceful cleanup...')
      
      // Kill any running processes
      await sandbox.process.executeCommand('pkill -f node || true')
      await sandbox.process.executeCommand('pkill -f chrome || true')
      await sandbox.process.executeCommand('pkill -f chromium || true')
      
      // Clean temporary files
      await sandbox.process.executeCommand('rm -f /tmp/advanced_extraction.js || true')
      
      console.log('✅ Cleanup completed successfully')
    } catch (error: any) {
      console.log('⚠️ Cleanup warning (non-critical):', error.message)
    }
  }

  /**
   * 🔄 Optimize configuration for retry
   */
  private static async optimizeConfigForRetry(config: AdvancedScanConfig, error: Error) {
    const errorMessage = error.message.toLowerCase()
    
    if (errorMessage.includes('timeout')) {
      console.log('🔧 Enabling timeout suspension for retry')
      return { ...config, timeoutDisabled: true }
    }
    
    if (errorMessage.includes('memory') || errorMessage.includes('resource')) {
      console.log('🔧 Upgrading to larger sandbox for retry')
      const upgradedType = this.upgradeScanType(config.scanType)
      return { ...config, scanType: upgradedType }
    }
    
    if (errorMessage.includes('module') || errorMessage.includes('dependency')) {
      console.log('🔧 Disabling snapshot for fresh install retry')
      return { ...config, useSnapshot: false }
    }
    
    // Default optimization
    return {
      ...config,
      timeoutDisabled: true,
      useSnapshot: false,
      scanType: this.upgradeScanType(config.scanType)
    }
  }

  /**
   * ⬆️ Upgrade scan type for better resources
   */
  private static upgradeScanType(currentType: string): any {
    const upgrades = {
      'small': 'medium',
      'medium': 'large', 
      'large': 'enterprise',
      'enterprise': 'enterprise' // Already at max
    }
    return upgrades[currentType] || 'medium'
  }

  /**
   * 📝 Generate advanced extraction script
   */
  private static generateAdvancedExtractionScript(
    config: AdvancedScanConfig,
    performanceConfig: any
  ): string {
    return `
const puppeteer = require('puppeteer');

async function executeAdvancedExtraction() {
  console.log('🚀 Starting ADVANCED Twitter extraction...');
  console.log('⚙️ Configuration:', {
    targetUsername: '${config.targetUsername}',
    scanType: '${config.scanType}',
    timeoutDisabled: ${config.timeoutDisabled ?? performanceConfig.timeoutDisabled},
    useSnapshot: ${config.useSnapshot ?? performanceConfig.useSnapshot},
    concurrency: ${config.concurrency || performanceConfig.concurrency},
    batchSize: ${config.batchSize || performanceConfig.batchSize},
    maxFollowers: ${config.maxFollowers || 10000}
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--memory-pressure-off',
      ${(config.timeoutDisabled ?? performanceConfig.timeoutDisabled) ? "'--disable-timeout'," : ""}
      ...('${performanceConfig.puppeteerArgs}'.split(' ') || [])
    ]
  });

  try {
    const page = await browser.newPage();
    
    // ⭐ OAUTH TOKEN INJECTION
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('twitter_oauth_token', '${config.authTokens.access_token}');
      localStorage.setItem('twitter_oauth_token_secret', '${config.authTokens.access_token_secret}');
      window.twitterAuth = {
        accessToken: '${config.authTokens.access_token}',
        accessTokenSecret: '${config.authTokens.access_token_secret}'
      };
    });

    // ⭐ ADVANCED EXTRACTION LOGIC
    const extractionUrls = [
      'https://x.com/${config.targetUsername}/followers',
      'https://twitter.com/${config.targetUsername}/followers',
      'https://x.com/${config.targetUsername}/following',
      'https://twitter.com/${config.targetUsername}/following'
    ];

    let followers = [];
    let successfulUrl = null;

    for (const url of extractionUrls) {
      try {
        console.log(\`🔍 Trying extraction from: \${url}\`);
        
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: ${(config.timeoutDisabled ?? performanceConfig.timeoutDisabled) ? '0' : '60000'}
        });

        // Wait for content to load
        await page.waitForSelector('[data-testid="UserCell"], [data-testid="cellInnerDiv"]', { 
          timeout: ${(config.timeoutDisabled ?? performanceConfig.timeoutDisabled) ? '0' : '30000'} 
        });

        // ⭐ OPTIMIZED EXTRACTION with batching
        const extractedFollowers = await page.evaluate((batchSize) => {
          const userCells = document.querySelectorAll('[data-testid="UserCell"]');
          const extracted = [];
          
          console.log(\`🔍 Found \${userCells.length} UserCell elements\`);
          
          userCells.forEach((cell, index) => {
            if (extracted.length >= batchSize) return; // Respect batch size
            
            const profileLinks = cell.querySelectorAll('a[href*="x.com/"], a[href*="twitter.com/"]');
            
            profileLinks.forEach(link => {
              const href = link.getAttribute('href');
              if (href && href.includes('/')) {
                const username = href.split('/').pop();
                if (username && 
                    !username.includes('?') && 
                    !username.includes('#') && 
                    username.length > 0 && 
                    username.length < 16 &&
                    /^[a-zA-Z0-9_]+$/.test(username)) {
                  
                  if (!extracted.includes(username)) {
                    extracted.push(username);
                    console.log(\`✅ Extracted: @\${username}\`);
                  }
                }
              }
            });
          });
          
          return extracted;
        }, ${config.batchSize || performanceConfig.batchSize});

        if (extractedFollowers.length > 0) {
          followers = extractedFollowers;
          successfulUrl = url;
          console.log(\`✅ Successfully extracted \${followers.length} followers from \${url}\`);
          break;
        }
        
      } catch (urlError) {
        console.log(\`⚠️ Failed to extract from \${url}: \${urlError.message}\`);
        continue;
      }
    }

    await browser.close();

    const results = {
      status: followers.length > 0 ? 'completed' : 'failed',
      followers: followers,
      totalFollowers: followers.length,
      method: 'advanced_oauth_browser_automation',
      successfulUrl: successfulUrl,
      extractionTime: new Date().toISOString(),
      targetUsername: '${config.targetUsername}',
      optimizations: {
        timeoutDisabled: ${config.timeoutDisabled ?? performanceConfig.timeoutDisabled},
        batchSize: ${config.batchSize || performanceConfig.batchSize},
        concurrency: ${config.concurrency || performanceConfig.concurrency}
      }
    };

    console.log('EXTRACTION_RESULTS:', JSON.stringify(results));
    return results;

  } catch (error) {
    await browser.close();
    console.error('EXTRACTION_ERROR:', error.message);
    throw error;
  }
}

executeAdvancedExtraction().catch(console.error);
`;
  }

  /**
   * 📋 Parse advanced extraction results
   */
  private static parseAdvancedResults(output: string, config: AdvancedScanConfig) {
    try {
      console.log('🔍 Parsing advanced extraction results...')
      
      const outputLines = output.split('\n')
      const resultLine = outputLines.find(line => line.startsWith('EXTRACTION_RESULTS:'))
      
      if (!resultLine) {
        console.log('❌ No EXTRACTION_RESULTS line found')
        console.log('📋 Output preview:', output.substring(0, 500))
        throw new Error('No extraction results found in output')
      }
      
      const results = JSON.parse(resultLine.replace('EXTRACTION_RESULTS:', ''))
      console.log(`✅ Parsed results: ${results.totalFollowers} followers`)
      
      return results
      
    } catch (error: any) {
      throw new Error(`Failed to parse results: ${error.message}`)
    }
  }
}

// ===== USAGE EXAMPLE =====

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ⭐ CONFIGURE ADVANCED SCAN
    const scanConfig: AdvancedScanConfig = {
      targetUsername: body.username,
      userId: body.userId,
      scanType: body.scanType || 'medium',
      
      authTokens: {
        access_token: body.authTokens.access_token,
        access_token_secret: body.authTokens.access_token_secret,
        bearer_token: body.authTokens.bearer_token
      },
      
      // ⭐ ENABLE ADVANCED FEATURES
      timeoutDisabled: body.timeoutDisabled ?? true,     // Enable for long operations
      useSnapshot: body.useSnapshot ?? true,            // Faster startup
      enableMonitoring: body.enableMonitoring ?? true,  // Resource tracking
      retryOnFailure: body.retryOnFailure ?? true,      // Auto-retry with optimization
      
      maxFollowers: body.maxFollowers || 10000,
      concurrency: body.concurrency,
      batchSize: body.batchSize
    }
    
    // ⭐ EXECUTE ADVANCED SCAN
    const result = await AdvancedDaytonaManager.executeAdvancedScan(scanConfig)
    
    return NextResponse.json({
      success: true,
      result,
      message: \`Advanced scan completed: \${result.totalFollowers} followers extracted\`
    })
    
  } catch (error: any) {
    console.error('❌ Advanced scan failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
