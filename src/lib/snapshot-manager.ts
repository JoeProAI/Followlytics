import { Daytona } from '@daytonaio/sdk'

export interface SnapshotConfig {
  name: string
  description: string
  packages: string[]
  browsers: string[]
  optimizations: {
    preloadDependencies: boolean
    cacheNodeModules: boolean
    optimizeStartup: boolean
  }
}

export class SnapshotManager {
  private static daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY!,
  })

  private static readonly SNAPSHOT_CONFIGS: Record<string, SnapshotConfig> = {
    'followlytics-base-v1': {
      name: 'followlytics-base-v1',
      description: 'Base Followlytics environment with essential dependencies',
      packages: [
        'puppeteer',
        'playwright',
        'beautifulsoup4',
        'requests',
        'selenium'
      ],
      browsers: ['chromium'],
      optimizations: {
        preloadDependencies: true,
        cacheNodeModules: true,
        optimizeStartup: false
      }
    },
    'followlytics-optimized-v1': {
      name: 'followlytics-optimized-v1',
      description: 'Optimized Followlytics environment with all dependencies and performance tuning',
      packages: [
        'puppeteer',
        'playwright',
        'beautifulsoup4',
        'requests',
        'selenium',
        'asyncio',
        'aiohttp',
        'twitter-api-py'
      ],
      browsers: ['chromium', 'firefox'],
      optimizations: {
        preloadDependencies: true,
        cacheNodeModules: true,
        optimizeStartup: true
      }
    },
    'followlytics-enterprise-v1': {
      name: 'followlytics-enterprise-v1',
      description: 'Enterprise Followlytics environment with maximum performance and all features',
      packages: [
        'puppeteer',
        'playwright',
        'beautifulsoup4',
        'requests',
        'selenium',
        'asyncio',
        'aiohttp',
        'twitter-api-py',
        'pandas',
        'numpy',
        'redis',
        'celery'
      ],
      browsers: ['chromium', 'firefox', 'webkit'],
      optimizations: {
        preloadDependencies: true,
        cacheNodeModules: true,
        optimizeStartup: true
      }
    }
  }

  /**
   * Create or update a snapshot with the specified configuration
   */
  static async createSnapshot(snapshotName: keyof typeof this.SNAPSHOT_CONFIGS) {
    try {
      const config = this.SNAPSHOT_CONFIGS[snapshotName]
      if (!config) {
        throw new Error(`Unknown snapshot configuration: ${snapshotName}`)
      }

      console.log(`📸 Creating snapshot: ${config.name}`)
      console.log(`📋 Description: ${config.description}`)

      // Create temporary sandbox for snapshot creation
      const tempSandboxName = `snapshot-builder-${snapshotName}-${Date.now()}`
      console.log(`🔧 Creating temporary sandbox: ${tempSandboxName}`)

      const tempSandbox = await this.daytona.createSandbox({
        name: tempSandboxName,
        language: 'javascript' as const,
        envVars: {
          SETUP_MODE: 'snapshot_creation',
          SNAPSHOT_NAME: config.name,
          PACKAGES: config.packages.join(','),
          BROWSERS: config.browsers.join(',')
        },
        resources: {
          cpu: '4',
          memory: '8Gi',
          storage: '20Gi'
        }
      })

      console.log(`✅ Temporary sandbox created: ${tempSandbox.id}`)

      // Setup environment in temporary sandbox
      await this.setupSnapshotEnvironment(tempSandbox, config)

      // Create snapshot from configured sandbox
      console.log(`📸 Creating snapshot from sandbox: ${tempSandbox.id}`)
      const snapshot = await this.daytona.createSnapshot({
        sandboxId: tempSandbox.id,
        name: config.name,
        description: config.description
      })

      console.log(`✅ Snapshot created successfully: ${snapshot.id}`)

      // Cleanup temporary sandbox
      console.log(`🧹 Cleaning up temporary sandbox: ${tempSandbox.id}`)
      await this.daytona.deleteSandbox(tempSandbox.id)
      console.log(`✅ Temporary sandbox cleaned up`)

      return snapshot

    } catch (error: any) {
      console.error(`❌ Failed to create snapshot ${snapshotName}:`, error)
      throw new Error(`Snapshot creation failed: ${error.message}`)
    }
  }

  /**
   * Setup environment in temporary sandbox for snapshot creation
   */
  private static async setupSnapshotEnvironment(sandbox: any, config: SnapshotConfig) {
    try {
      console.log(`⚙️ Setting up environment for snapshot: ${config.name}`)

      // Generate setup script based on configuration
      const setupScript = this.generateSetupScript(config)

      // Execute setup script
      console.log(`🚀 Executing setup script...`)
      const result = await sandbox.process.executeCommand(setupScript)

      if (result.exitCode !== 0) {
        throw new Error(`Setup script failed with exit code ${result.exitCode}: ${result.result}`)
      }

      console.log(`✅ Environment setup completed for ${config.name}`)

    } catch (error: any) {
      console.error(`❌ Environment setup failed:`, error)
      throw error
    }
  }

  /**
   * Generate setup script based on snapshot configuration
   */
  private static generateSetupScript(config: SnapshotConfig): string {
    const { packages, browsers, optimizations } = config

    return `
#!/bin/bash
set -e

echo "🔧 Setting up ${config.name} environment..."

# Update system packages
echo "📦 Updating system packages..."
apt-get update
apt-get install -y python3 python3-pip curl wget git build-essential

# Install Node.js LTS
echo "📦 Installing Node.js LTS..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

# Update npm to latest
echo "📦 Updating npm..."
npm install -g npm@latest

# Install Node.js packages
echo "📦 Installing Node.js packages..."
npm init -y
${packages.filter(pkg => ['puppeteer', 'playwright'].includes(pkg))
  .map(pkg => `npm install ${pkg} --save`)
  .join('\n')}

# Install Python packages
echo "📦 Installing Python packages..."
${packages.filter(pkg => !['puppeteer', 'playwright'].includes(pkg))
  .map(pkg => `pip3 install ${pkg}`)
  .join('\n')}

# Install browsers
echo "🌐 Installing browsers..."
${browsers.includes('chromium') ? 'npx playwright install chromium' : ''}
${browsers.includes('firefox') ? 'npx playwright install firefox' : ''}
${browsers.includes('webkit') ? 'npx playwright install webkit' : ''}
${packages.includes('puppeteer') ? 'npx puppeteer browsers install chrome' : ''}

# Apply optimizations
${optimizations.preloadDependencies ? `
echo "⚡ Preloading dependencies..."
# Preload common modules
node -e "
  require('puppeteer');
  require('playwright');
  console.log('Dependencies preloaded');
"
` : ''}

${optimizations.cacheNodeModules ? `
echo "💾 Optimizing node_modules cache..."
npm cache verify
npm cache clean --force
` : ''}

${optimizations.optimizeStartup ? `
echo "🚀 Optimizing startup performance..."

# Create optimized startup script
cat > /opt/followlytics-startup.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting optimized Followlytics environment..."

# Set performance environment variables
export NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"
export PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-accelerated-2d-canvas --no-first-run --no-zygote --single-process --disable-gpu --memory-pressure-off"
export PLAYWRIGHT_BROWSERS_PATH="/ms-playwright"

# Preload critical modules
node -e "
  const puppeteer = require('puppeteer');
  const { chromium } = require('playwright');
  console.log('Critical modules preloaded');
" 2>/dev/null || true

echo "✅ Optimized environment ready"
EOF

chmod +x /opt/followlytics-startup.sh

# Create environment configuration
cat > /opt/followlytics-env.json << 'EOF'
{
  "snapshot_name": "${config.name}",
  "packages": ${JSON.stringify(packages)},
  "browsers": ${JSON.stringify(browsers)},
  "optimizations": ${JSON.stringify(optimizations)},
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
` : ''}

# Clean up to reduce snapshot size
echo "🧹 Cleaning up..."
apt-get autoremove -y
apt-get autoclean
rm -rf /var/lib/apt/lists/*
rm -rf /tmp/*
npm cache clean --force

# Verify installation
echo "✅ Verifying installation..."
node --version
npm --version
python3 --version
pip3 --version

# Test critical packages
node -e "
  try {
    require('puppeteer');
    console.log('✅ Puppeteer: OK');
  } catch(e) {
    console.log('❌ Puppeteer: FAILED');
  }
  
  try {
    require('playwright');
    console.log('✅ Playwright: OK');
  } catch(e) {
    console.log('❌ Playwright: FAILED');
  }
"

python3 -c "
try:
    import requests
    print('✅ Requests: OK')
except ImportError:
    print('❌ Requests: FAILED')

try:
    import selenium
    print('✅ Selenium: OK')
except ImportError:
    print('❌ Selenium: FAILED')
"

echo "✅ ${config.name} environment setup complete!"
    `
  }

  /**
   * List all available snapshots
   */
  static async listSnapshots() {
    try {
      console.log(`📋 Listing available snapshots...`)
      const snapshots = await this.daytona.listSnapshots()
      
      console.log(`📊 Found ${snapshots.length} snapshots:`)
      snapshots.forEach(snapshot => {
        console.log(`  📸 ${snapshot.name}: ${snapshot.description}`)
      })

      return snapshots

    } catch (error: any) {
      console.error(`❌ Failed to list snapshots:`, error)
      throw error
    }
  }

  /**
   * Delete a snapshot
   */
  static async deleteSnapshot(snapshotName: string) {
    try {
      console.log(`🗑️ Deleting snapshot: ${snapshotName}`)
      await this.daytona.deleteSnapshot(snapshotName)
      console.log(`✅ Snapshot deleted: ${snapshotName}`)

    } catch (error: any) {
      console.error(`❌ Failed to delete snapshot ${snapshotName}:`, error)
      throw error
    }
  }

  /**
   * Check if a snapshot exists
   */
  static async snapshotExists(snapshotName: string): Promise<boolean> {
    try {
      const snapshots = await this.daytona.listSnapshots()
      return snapshots.some(snapshot => snapshot.name === snapshotName)

    } catch (error: any) {
      console.error(`❌ Failed to check snapshot existence:`, error)
      return false
    }
  }

  /**
   * Create all predefined snapshots
   */
  static async createAllSnapshots() {
    try {
      console.log(`🏗️ Creating all predefined snapshots...`)
      
      const snapshotNames = Object.keys(this.SNAPSHOT_CONFIGS) as Array<keyof typeof this.SNAPSHOT_CONFIGS>
      const results = []

      for (const snapshotName of snapshotNames) {
        try {
          console.log(`\n📸 Creating snapshot: ${snapshotName}`)
          const snapshot = await this.createSnapshot(snapshotName)
          results.push({ name: snapshotName, success: true, snapshot })
          console.log(`✅ Successfully created: ${snapshotName}`)
        } catch (error: any) {
          console.error(`❌ Failed to create ${snapshotName}:`, error)
          results.push({ name: snapshotName, success: false, error: error.message })
        }
      }

      console.log(`\n📊 Snapshot creation summary:`)
      results.forEach(result => {
        if (result.success) {
          console.log(`  ✅ ${result.name}: Created successfully`)
        } else {
          console.log(`  ❌ ${result.name}: Failed - ${result.error}`)
        }
      })

      return results

    } catch (error: any) {
      console.error(`❌ Failed to create all snapshots:`, error)
      throw error
    }
  }

  /**
   * Get snapshot configuration
   */
  static getSnapshotConfig(snapshotName: keyof typeof this.SNAPSHOT_CONFIGS) {
    return this.SNAPSHOT_CONFIGS[snapshotName]
  }

  /**
   * Get all snapshot configurations
   */
  static getAllSnapshotConfigs() {
    return this.SNAPSHOT_CONFIGS
  }
}

export default SnapshotManager
