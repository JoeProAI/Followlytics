# Followlytics Enterprise Production Deployment Guide

## 🚀 Complete Unified Daytona System Deployment

This guide covers the deployment of the complete Followlytics Enterprise system with unified Daytona scanning, real-time monitoring, and production-grade infrastructure.

## 📋 Prerequisites

### Environment Requirements
- **Daytona Account**: Enterprise or Pro tier
- **Node.js**: Version 18+ 
- **Python**: Version 3.9+
- **Docker**: For containerized deployment
- **Domain**: For production web interface
- **SSL Certificate**: For HTTPS

### Required Environment Variables

#### Daytona Configuration
```bash
DAYTONA_ORG_ID=your_org_id
DAYTONA_API_KEY=your_api_key
DAYTONA_API_URL=https://api.daytona.io
DAYTONA_COORDINATOR_URL=https://your-coordinator.domain.com
```

#### Database Configuration
```bash
DATABASE_URL=postgresql://user:pass@host:5432/followlytics
REDIS_URL=redis://user:pass@host:6379
```

#### Authentication & Security
```bash
NEXTAUTH_SECRET=your_secure_secret
NEXTAUTH_URL=https://your-domain.com
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

#### Monitoring & Alerts
```bash
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=alerts@yourdomain.com
SMTP_PASSWORD=your_app_password
ALERT_RECIPIENTS=admin@yourdomain.com,ops@yourdomain.com
```

#### Firebase Configuration
```bash
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
```

## 🏗️ Deployment Architecture

### System Components

1. **Frontend Dashboard** (Next.js)
   - User interface with unified Daytona scanning
   - Real-time monitoring dashboard
   - Enterprise analytics and reporting

2. **Unified Daytona Coordinator** (FastAPI)
   - Job routing and orchestration
   - Worker pool management
   - Cost optimization and monitoring

3. **Monitoring System** (Python)
   - Real-time health checks
   - Alert management
   - Performance metrics collection

4. **Database Layer**
   - PostgreSQL for persistent data
   - Redis for caching and sessions

## 📦 Step-by-Step Deployment

### Step 1: Deploy the Frontend Dashboard

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Deploy to Vercel (recommended)
vercel --prod

# Or deploy to your preferred platform
# Docker deployment:
docker build -t followlytics-frontend .
docker run -p 3000:3000 followlytics-frontend
```

### Step 2: Deploy the Unified Daytona Coordinator

```bash
# Navigate to daytona directory
cd daytona

# Install Python dependencies
pip install -r requirements.txt

# Run deployment script
python deploy.py

# Or manual deployment:
python -m uvicorn unified_coordinator:app --host 0.0.0.0 --port 8000
```

### Step 3: Start the Monitoring System

```bash
# Start monitoring dashboard
python -m daytona.monitoring

# Or run as background service
nohup python -m daytona.monitoring > monitoring.log 2>&1 &
```

### Step 4: Configure Load Balancer and SSL

```nginx
# Nginx configuration example
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Daytona Coordinator
    location /coordinator/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔧 Configuration Management

### Production Configuration Files

#### 1. Coordinator Configuration (`daytona/config.py`)
```python
# Production settings
WORKER_POOL_SIZE = 50
MAX_CONCURRENT_JOBS = 100
COST_OPTIMIZATION_ENABLED = True
MONITORING_ENABLED = True
LOG_LEVEL = "INFO"
```

#### 2. Frontend Configuration (`next.config.js`)
```javascript
module.exports = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_DAYTONA_COORDINATOR_URL: process.env.DAYTONA_COORDINATOR_URL,
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
}
```

#### 3. Database Migrations
```bash
# Run database migrations
npx prisma migrate deploy

# Or for custom database setup
python manage.py migrate
```

## 📊 Monitoring and Health Checks

### Health Check Endpoints

- **Frontend**: `https://your-domain.com/api/health`
- **Coordinator**: `https://your-domain.com/coordinator/health`
- **Monitoring**: `https://your-domain.com/api/enterprise/monitoring`

### Key Metrics to Monitor

1. **System Health**
   - Response times < 2 seconds
   - Error rates < 1%
   - Uptime > 99.9%

2. **Scanning Performance**
   - Jobs completed per hour
   - Average processing time
   - Worker utilization

3. **Cost Management**
   - Hourly cost trends
   - Resource efficiency
   - Budget alerts

### Alert Configuration

```python
# monitoring.py alert thresholds
ALERT_THRESHOLDS = {
    "job_failure_rate": 0.05,      # 5%
    "response_time_ms": 2000,      # 2 seconds
    "worker_utilization": 0.85,    # 85%
    "cost_spike_threshold": 1.3,   # 30% increase
    "queue_depth": 50,             # jobs
    "error_rate": 0.01             # 1%
}
```

## 🔒 Security Configuration

### SSL/TLS Setup
```bash
# Let's Encrypt certificate
certbot --nginx -d your-domain.com

# Or use your preferred SSL provider
```

### API Security
```javascript
// Rate limiting
const rateLimit = require('express-rate-limit')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})

app.use('/api/', limiter)
```

### Database Security
```sql
-- Create dedicated database user
CREATE USER followlytics_prod WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO followlytics_prod;
```

## 🚀 Scaling Configuration

### Horizontal Scaling

#### Frontend Scaling
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    image: followlytics-frontend
    replicas: 3
    ports:
      - "3000-3002:3000"
    environment:
      - NODE_ENV=production
```

#### Coordinator Scaling
```python
# Multiple coordinator instances
# Use load balancer to distribute requests
uvicorn unified_coordinator:app --workers 4 --host 0.0.0.0 --port 8000
```

### Auto-scaling Configuration
```python
# Auto-scaler settings
AUTO_SCALER_CONFIG = {
    "min_workers": 5,
    "max_workers": 100,
    "scale_up_threshold": 0.8,    # 80% utilization
    "scale_down_threshold": 0.3,  # 30% utilization
    "scale_up_cooldown": 300,     # 5 minutes
    "scale_down_cooldown": 600,   # 10 minutes
}
```

## 📈 Performance Optimization

### Database Optimization
```sql
-- Index optimization
CREATE INDEX CONCURRENTLY idx_followers_user_id ON followers(user_id);
CREATE INDEX CONCURRENTLY idx_jobs_status ON scan_jobs(status);
CREATE INDEX CONCURRENTLY idx_jobs_created_at ON scan_jobs(created_at);
```

### Caching Strategy
```javascript
// Redis caching
const redis = require('redis')
const client = redis.createClient(process.env.REDIS_URL)

// Cache frequently accessed data
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    const key = req.originalUrl
    const cached = await client.get(key)
    
    if (cached) {
      return res.json(JSON.parse(cached))
    }
    
    res.sendResponse = res.json
    res.json = (body) => {
      client.setex(key, duration, JSON.stringify(body))
      res.sendResponse(body)
    }
    
    next()
  }
}
```

## 🔄 Backup and Recovery

### Database Backup
```bash
# Automated daily backups
#!/bin/bash
pg_dump $DATABASE_URL > "backup_$(date +%Y%m%d_%H%M%S).sql"

# Upload to cloud storage
aws s3 cp backup_*.sql s3://your-backup-bucket/
```

### Configuration Backup
```bash
# Backup environment variables and configs
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  .env.production \
  daytona/config.py \
  nginx.conf
```

## 🧪 Testing and Validation

### Production Smoke Tests
```bash
# Run production health checks
curl -f https://your-domain.com/api/health
curl -f https://your-domain.com/coordinator/health

# Test scanning functionality
python -c "
from daytona.test_suite import MassiveScaleTestSuite
import asyncio
asyncio.run(MassiveScaleTestSuite().run_production_smoke_test())
"
```

### Load Testing
```bash
# Use Apache Bench for load testing
ab -n 1000 -c 10 https://your-domain.com/api/health

# Or use more advanced tools
artillery run load-test-config.yml
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates installed
- [ ] DNS records configured
- [ ] Monitoring alerts configured
- [ ] Backup systems tested

### Deployment
- [ ] Frontend deployed and accessible
- [ ] Coordinator service running
- [ ] Monitoring system active
- [ ] Load balancer configured
- [ ] Health checks passing

### Post-Deployment
- [ ] Smoke tests completed
- [ ] Performance metrics baseline established
- [ ] Alert notifications tested
- [ ] Documentation updated
- [ ] Team trained on new system

## 🆘 Troubleshooting

### Common Issues

#### 1. Coordinator Connection Issues
```bash
# Check coordinator logs
tail -f coordinator.log

# Test connectivity
curl -v http://localhost:8000/health
```

#### 2. Database Connection Problems
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
python -c "from sqlalchemy import create_engine; engine = create_engine('$DATABASE_URL'); print(engine.execute('SELECT 1').scalar())"
```

#### 3. Worker Scaling Issues
```python
# Check worker status
from daytona.client import DaytonaClient
import asyncio

async def check_workers():
    client = DaytonaClient()
    workers = await client.list_sandboxes()
    print(f"Active workers: {len([w for w in workers if w.status == 'running'])}")

asyncio.run(check_workers())
```

## 📞 Support and Maintenance

### Monitoring Dashboards
- **System Health**: `https://your-domain.com/enterprise/monitoring`
- **Cost Analytics**: `https://your-domain.com/enterprise/analytics`
- **Job Queue**: `https://your-domain.com/enterprise/jobs`

### Log Locations
- Frontend logs: `/var/log/followlytics/frontend.log`
- Coordinator logs: `/var/log/followlytics/coordinator.log`
- Monitoring logs: `/var/log/followlytics/monitoring.log`

### Emergency Contacts
- **System Administrator**: admin@yourdomain.com
- **DevOps Team**: devops@yourdomain.com
- **On-call Engineer**: +1-xxx-xxx-xxxx

## 🎉 Deployment Complete!

Your Followlytics Enterprise system with unified Daytona scanning is now deployed and ready for production use. The system provides:

✅ **Unified Scanning**: All follower scanning through optimized Daytona infrastructure  
✅ **Real-time Monitoring**: Comprehensive health checks and alerting  
✅ **Auto-scaling**: Dynamic resource management based on demand  
✅ **Cost Optimization**: Intelligent cost monitoring and optimization  
✅ **Enterprise Security**: Production-grade security and compliance  
✅ **High Availability**: Redundant systems and automatic failover  

For ongoing support and maintenance, refer to the monitoring dashboards and follow the established operational procedures.

---

**System Status**: ✅ Production Ready  
**Deployment Date**: $(date)  
**Version**: 1.0.0 Enterprise  
**Next Review**: $(date -d "+30 days")
