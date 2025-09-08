#!/bin/bash

# Daytona Coordinator Production Deployment Script
set -e

echo "🚀 Deploying Daytona Coordinator to Production..."

# Check required environment variables
if [ -z "$DAYTONA_ORG_ID" ] || [ -z "$DAYTONA_API_KEY" ]; then
    echo "❌ Error: DAYTONA_ORG_ID and DAYTONA_API_KEY environment variables are required"
    echo "Please set them in your .env file or export them:"
    echo "export DAYTONA_ORG_ID=your_org_id"
    echo "export DAYTONA_API_KEY=your_api_key"
    exit 1
fi

# Create production directory
mkdir -p production-daytona
cd production-daytona

# Copy Daytona files
cp -r ../daytona/* .

# Build and deploy with Docker
echo "📦 Building Daytona Coordinator Docker image..."
docker build -t followlytics-daytona-coordinator .

echo "🔧 Starting Daytona Coordinator service..."
docker-compose up -d

# Wait for service to be ready
echo "⏳ Waiting for coordinator to be ready..."
sleep 10

# Health check
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Daytona Coordinator is running successfully!"
    echo "📊 Service URL: http://localhost:8000"
    echo "📈 Health Check: http://localhost:8000/health"
    echo "📋 System Stats: http://localhost:8000/system/stats"
    
    # Get the public IP for external access
    PUBLIC_IP=$(curl -s ifconfig.me || echo "localhost")
    echo "🌐 External URL: http://$PUBLIC_IP:8000"
    echo ""
    echo "🔗 Add this to your Vercel environment variables:"
    echo "DAYTONA_COORDINATOR_URL=http://$PUBLIC_IP:8000"
    
else
    echo "❌ Health check failed. Checking logs..."
    docker-compose logs daytona-coordinator
    exit 1
fi

echo ""
echo "🎉 Deployment complete! Your Daytona Coordinator is ready for production use."
