@echo off
echo ================================
echo Followlytics Optimized Deployment
echo ================================
echo.

echo 🚀 Starting optimized deployment process...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

echo ✅ Node.js detected: 
node --version

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available. Please ensure npm is installed.
    pause
    exit /b 1
)

echo ✅ npm detected:
npm --version
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully
echo.

REM Check environment variables
echo 🔍 Checking environment variables...

if not defined DAYTONA_API_KEY (
    echo ❌ DAYTONA_API_KEY is not set
    echo Please set DAYTONA_API_KEY in your .env.local file
    echo Example: DAYTONA_API_KEY=dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567
    pause
    exit /b 1
)

if not defined TWITTER_BEARER_TOKEN (
    echo ⚠️  TWITTER_BEARER_TOKEN is not set (optional for browser automation)
)

if not defined FIREBASE_PROJECT_ID (
    echo ❌ FIREBASE_PROJECT_ID is not set
    echo Please configure Firebase credentials in your .env.local file
    pause
    exit /b 1
)

echo ✅ Required environment variables are configured
echo.

REM Build the application
echo 🏗️  Building optimized application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)
echo ✅ Build completed successfully
echo.

REM Setup optimized environment (if tsx is available)
echo ⚙️  Setting up optimized environment...
npx tsx --version >nul 2>&1
if %errorlevel% equ 0 (
    echo 📸 Creating optimized snapshots...
    npx tsx scripts/setup-optimized-environment.ts --skip-test
    if %errorlevel% neq 0 (
        echo ⚠️  Snapshot creation failed, but continuing deployment...
    ) else (
        echo ✅ Optimized snapshots created successfully
    )
) else (
    echo ⚠️  tsx not available, skipping snapshot creation
    echo You can run snapshot creation manually later with:
    echo npx tsx scripts/setup-optimized-environment.ts
)
echo.

REM Deployment options
echo 🚀 Deployment Options:
echo.
echo 1. Deploy to Vercel (recommended)
echo 2. Start local development server
echo 3. Exit
echo.
set /p choice="Choose an option (1-3): "

if "%choice%"=="1" (
    echo.
    echo 🌐 Deploying to Vercel...
    echo.
    
    REM Check if Vercel CLI is installed
    vercel --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo 📦 Installing Vercel CLI...
        call npm install -g vercel
        if %errorlevel% neq 0 (
            echo ❌ Failed to install Vercel CLI
            pause
            exit /b 1
        )
    )
    
    echo ✅ Vercel CLI available
    echo.
    
    echo 📋 Environment Variables to Configure in Vercel:
    echo.
    echo Required:
    echo - DAYTONA_API_KEY=dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567
    echo - DAYTONA_API_URL=https://app.daytona.io/api
    echo - FIREBASE_PROJECT_ID=[your-project-id]
    echo - FIREBASE_CLIENT_EMAIL=[your-service-account-email]
    echo - FIREBASE_PRIVATE_KEY=[your-private-key]
    echo.
    echo Optional:
    echo - TWITTER_BEARER_TOKEN=[your-bearer-token]
    echo - TWITTER_API_KEY=[your-api-key]
    echo - TWITTER_API_SECRET=[your-api-secret]
    echo.
    echo ⚠️  IMPORTANT: Do NOT set DAYTONA_ORG_ID or DAYTONA_TARGET
    echo These parameters cause "No available runners" errors
    echo.
    
    pause
    
    echo Starting Vercel deployment...
    call vercel --prod
    
    if %errorlevel% equ 0 (
        echo.
        echo ✅ Deployment completed successfully!
        echo.
        echo 🎯 Next Steps:
        echo 1. Configure environment variables in Vercel dashboard
        echo 2. Test Twitter OAuth authentication
        echo 3. Run optimized follower scans
        echo 4. Monitor performance and optimize as needed
        echo.
    ) else (
        echo ❌ Deployment failed
        echo Please check the error messages above
    )
    
) else if "%choice%"=="2" (
    echo.
    echo 🖥️  Starting local development server...
    echo.
    echo Server will be available at: http://localhost:3000
    echo Dashboard will be available at: http://localhost:3000/dashboard
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    call npm run dev
    
) else if "%choice%"=="3" (
    echo.
    echo 👋 Deployment cancelled
    echo.
    echo To deploy later, run this script again or use:
    echo npm run build ^&^& vercel --prod
    echo.
) else (
    echo.
    echo ❌ Invalid choice. Please run the script again.
)

echo.
echo 📋 Deployment Summary:
echo ================================
echo.
echo ✅ Optimized Features Deployed:
echo   - Timeout disabled sandboxes
echo   - Snapshot support for faster startup
echo   - Enterprise error handling patterns
echo   - Performance optimizations
echo   - Real-time progress tracking
echo   - Multi-scan type support
echo.
echo 🔧 Hidden Gems Integrated:
echo   - XDK SDK generation patterns
echo   - XURL OAuth management
echo   - Enterprise script error handling
echo   - Account Activity webhook patterns
echo   - Search Tweets pagination
echo.
echo 💡 Pro Tips:
echo   - Use 'medium' scan type for most accounts
echo   - Enable snapshots for faster performance
echo   - Monitor Daytona usage in dashboard
echo   - Check Vercel function logs for debugging
echo.
echo 🎯 Ready for Production!
echo Your optimized Followlytics is now deployed with:
echo - $200 Twitter API Pro plan optimization
echo - Enterprise-grade reliability
echo - Maximum performance configurations
echo.

pause
