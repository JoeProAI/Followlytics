@echo off
echo 🚀 Deploying Daytona Coordinator to Production...

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check required environment variables
if "%DAYTONA_ORG_ID%"=="" (
    echo ❌ Error: DAYTONA_ORG_ID environment variable is required
    echo Please set it in your environment or .env file
    pause
    exit /b 1
)

if "%DAYTONA_API_KEY%"=="" (
    echo ❌ Error: DAYTONA_API_KEY environment variable is required
    echo Please set it in your environment or .env file
    pause
    exit /b 1
)

REM Navigate to daytona directory
cd daytona

echo 📦 Building Daytona Coordinator Docker image...
docker build -t followlytics-daytona-coordinator .

if %errorlevel% neq 0 (
    echo ❌ Docker build failed
    pause
    exit /b 1
)

echo 🔧 Starting Daytona Coordinator service...
docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Docker compose failed
    pause
    exit /b 1
)

echo ⏳ Waiting for coordinator to be ready...
timeout /t 10 /nobreak >nul

REM Health check
curl -f http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Daytona Coordinator is running successfully!
    echo 📊 Service URL: http://localhost:8000
    echo 📈 Health Check: http://localhost:8000/health
    echo 📋 System Stats: http://localhost:8000/system/stats
    echo.
    echo 🔗 Add this to your Vercel environment variables:
    echo DAYTONA_COORDINATOR_URL=http://localhost:8000
    echo.
    echo 🎉 Deployment complete! Your Daytona Coordinator is ready for production use.
) else (
    echo ❌ Health check failed. Checking logs...
    docker-compose logs daytona-coordinator
)

pause
