# Production Monitoring and Alerting System for Followlytics Daytona
import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class MetricType(Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"

@dataclass
class Alert:
    """Represents a system alert"""
    id: str
    severity: AlertSeverity
    title: str
    description: str
    timestamp: datetime
    source: str
    resolved: bool = False
    acknowledged: bool = False
    metadata: Dict[str, Any] = None

@dataclass
class Metric:
    """Represents a system metric"""
    name: str
    value: float
    metric_type: MetricType
    timestamp: datetime
    labels: Dict[str, str] = None
    unit: str = ""

@dataclass
class HealthCheck:
    """Health check result"""
    service: str
    status: str  # healthy, degraded, unhealthy
    response_time_ms: float
    timestamp: datetime
    details: Dict[str, Any] = None

class MonitoringDashboard:
    """Production monitoring dashboard for Daytona system"""
    
    def __init__(self, coordinator_url: str = "http://localhost:8000"):
        self.coordinator_url = coordinator_url
        self.metrics: List[Metric] = []
        self.alerts: List[Alert] = []
        self.health_checks: List[HealthCheck] = []
        self.alert_handlers: List[Callable] = []
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Monitoring configuration
        self.check_interval = 30  # seconds
        self.alert_thresholds = {
            "job_failure_rate": 0.1,  # 10%
            "average_response_time": 5000,  # 5 seconds
            "worker_utilization": 0.9,  # 90%
            "cost_spike_threshold": 1.5,  # 50% increase
            "queue_depth": 100,  # jobs
            "error_rate": 0.05  # 5%
        }
        
    async def initialize(self):
        """Initialize monitoring dashboard"""
        logger.info("Initializing Production Monitoring Dashboard...")
        self.session = aiohttp.ClientSession()
        
        # Set up default alert handlers
        self.add_alert_handler(self._log_alert)
        
        logger.info("Monitoring Dashboard initialized")
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
    
    def add_alert_handler(self, handler: Callable[[Alert], None]):
        """Add custom alert handler"""
        self.alert_handlers.append(handler)
    
    async def start_monitoring(self):
        """Start continuous monitoring"""
        logger.info("Starting continuous monitoring...")
        
        while True:
            try:
                await self._collect_metrics()
                await self._perform_health_checks()
                await self._evaluate_alerts()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                await asyncio.sleep(self.check_interval)
    
    async def _collect_metrics(self):
        """Collect system metrics"""
        try:
            # Coordinator metrics
            coordinator_metrics = await self._get_coordinator_metrics()
            if coordinator_metrics:
                self._record_metrics(coordinator_metrics, "coordinator")
            
            # Worker metrics
            worker_metrics = await self._get_worker_metrics()
            if worker_metrics:
                self._record_metrics(worker_metrics, "workers")
            
            # Job metrics
            job_metrics = await self._get_job_metrics()
            if job_metrics:
                self._record_metrics(job_metrics, "jobs")
                
        except Exception as e:
            logger.error(f"Metrics collection error: {e}")
    
    async def _get_coordinator_metrics(self) -> Optional[Dict[str, Any]]:
        """Get coordinator system metrics"""
        try:
            async with self.session.get(f"{self.coordinator_url}/metrics") as response:
                if response.status == 200:
                    return await response.json()
        except Exception as e:
            logger.warning(f"Failed to get coordinator metrics: {e}")
        return None
    
    async def _get_worker_metrics(self) -> Optional[Dict[str, Any]]:
        """Get worker metrics"""
        try:
            async with self.session.get(f"{self.coordinator_url}/workers/metrics") as response:
                if response.status == 200:
                    return await response.json()
        except Exception as e:
            logger.warning(f"Failed to get worker metrics: {e}")
        return None
    
    async def _get_job_metrics(self) -> Optional[Dict[str, Any]]:
        """Get job processing metrics"""
        try:
            async with self.session.get(f"{self.coordinator_url}/jobs/metrics") as response:
                if response.status == 200:
                    return await response.json()
        except Exception as e:
            logger.warning(f"Failed to get job metrics: {e}")
        return None
    
    def _record_metrics(self, metrics_data: Dict[str, Any], source: str):
        """Record metrics from data"""
        timestamp = datetime.utcnow()
        
        for key, value in metrics_data.items():
            if isinstance(value, (int, float)):
                metric = Metric(
                    name=f"{source}.{key}",
                    value=float(value),
                    metric_type=MetricType.GAUGE,
                    timestamp=timestamp,
                    labels={"source": source}
                )
                self.metrics.append(metric)
        
        # Keep only recent metrics (last 24 hours)
        cutoff = datetime.utcnow() - timedelta(hours=24)
        self.metrics = [m for m in self.metrics if m.timestamp > cutoff]
    
    async def _perform_health_checks(self):
        """Perform health checks on system components"""
        checks = [
            self._check_coordinator_health(),
            self._check_worker_health(),
            self._check_database_health()
        ]
        
        results = await asyncio.gather(*checks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, HealthCheck):
                self.health_checks.append(result)
        
        # Keep only recent health checks (last hour)
        cutoff = datetime.utcnow() - timedelta(hours=1)
        self.health_checks = [h for h in self.health_checks if h.timestamp > cutoff]
    
    async def _check_coordinator_health(self) -> HealthCheck:
        """Check coordinator health"""
        start_time = time.time()
        
        try:
            async with self.session.get(f"{self.coordinator_url}/health") as response:
                response_time = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    status = "healthy" if data.get("status") == "ok" else "degraded"
                else:
                    status = "unhealthy"
                
                return HealthCheck(
                    service="coordinator",
                    status=status,
                    response_time_ms=response_time,
                    timestamp=datetime.utcnow(),
                    details={"status_code": response.status}
                )
        except Exception as e:
            return HealthCheck(
                service="coordinator",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                details={"error": str(e)}
            )
    
    async def _check_worker_health(self) -> HealthCheck:
        """Check worker health"""
        try:
            worker_metrics = await self._get_worker_metrics()
            
            if worker_metrics:
                active_workers = worker_metrics.get("active_workers", 0)
                failed_workers = worker_metrics.get("failed_workers", 0)
                
                if failed_workers > active_workers * 0.2:  # More than 20% failed
                    status = "degraded"
                elif failed_workers > 0:
                    status = "degraded"
                else:
                    status = "healthy"
            else:
                status = "unhealthy"
            
            return HealthCheck(
                service="workers",
                status=status,
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                details=worker_metrics or {}
            )
        except Exception as e:
            return HealthCheck(
                service="workers",
                status="unhealthy",
                response_time_ms=0,
                timestamp=datetime.utcnow(),
                details={"error": str(e)}
            )
    
    async def _check_database_health(self) -> HealthCheck:
        """Check database connectivity"""
        # Mock implementation - would check actual database
        return HealthCheck(
            service="database",
            status="healthy",
            response_time_ms=50,
            timestamp=datetime.utcnow(),
            details={"connection_pool": "ok"}
        )
    
    async def _evaluate_alerts(self):
        """Evaluate metrics and trigger alerts"""
        current_time = datetime.utcnow()
        
        # Check job failure rate
        await self._check_job_failure_rate(current_time)
        
        # Check response times
        await self._check_response_times(current_time)
        
        # Check worker utilization
        await self._check_worker_utilization(current_time)
        
        # Check cost spikes
        await self._check_cost_spikes(current_time)
        
        # Check queue depth
        await self._check_queue_depth(current_time)
        
        # Check error rates
        await self._check_error_rates(current_time)
    
    async def _check_job_failure_rate(self, current_time: datetime):
        """Check for high job failure rates"""
        recent_jobs = [m for m in self.metrics 
                      if m.name.startswith("jobs.") and 
                      current_time - m.timestamp < timedelta(minutes=10)]
        
        if recent_jobs:
            failed_jobs = [m for m in recent_jobs if "failed" in m.name]
            total_jobs = [m for m in recent_jobs if "total" in m.name]
            
            if failed_jobs and total_jobs:
                failure_rate = sum(m.value for m in failed_jobs) / sum(m.value for m in total_jobs)
                
                if failure_rate > self.alert_thresholds["job_failure_rate"]:
                    await self._create_alert(
                        AlertSeverity.HIGH,
                        "High Job Failure Rate",
                        f"Job failure rate is {failure_rate:.2%}, exceeding threshold of {self.alert_thresholds['job_failure_rate']:.2%}",
                        "job_monitoring"
                    )
    
    async def _check_response_times(self, current_time: datetime):
        """Check for high response times"""
        recent_health_checks = [h for h in self.health_checks 
                               if current_time - h.timestamp < timedelta(minutes=5)]
        
        if recent_health_checks:
            avg_response_time = sum(h.response_time_ms for h in recent_health_checks) / len(recent_health_checks)
            
            if avg_response_time > self.alert_thresholds["average_response_time"]:
                await self._create_alert(
                    AlertSeverity.MEDIUM,
                    "High Response Times",
                    f"Average response time is {avg_response_time:.1f}ms, exceeding threshold of {self.alert_thresholds['average_response_time']}ms",
                    "performance_monitoring"
                )
    
    async def _check_worker_utilization(self, current_time: datetime):
        """Check worker utilization"""
        recent_worker_metrics = [m for m in self.metrics 
                                if m.name.startswith("workers.utilization") and 
                                current_time - m.timestamp < timedelta(minutes=5)]
        
        if recent_worker_metrics:
            avg_utilization = sum(m.value for m in recent_worker_metrics) / len(recent_worker_metrics)
            
            if avg_utilization > self.alert_thresholds["worker_utilization"]:
                await self._create_alert(
                    AlertSeverity.MEDIUM,
                    "High Worker Utilization",
                    f"Worker utilization is {avg_utilization:.2%}, exceeding threshold of {self.alert_thresholds['worker_utilization']:.2%}",
                    "capacity_monitoring"
                )
    
    async def _check_cost_spikes(self, current_time: datetime):
        """Check for cost spikes"""
        recent_cost_metrics = [m for m in self.metrics 
                              if m.name.startswith("coordinator.hourly_cost") and 
                              current_time - m.timestamp < timedelta(hours=1)]
        
        if len(recent_cost_metrics) >= 2:
            current_cost = recent_cost_metrics[-1].value
            previous_cost = recent_cost_metrics[-2].value
            
            if previous_cost > 0:
                cost_increase = current_cost / previous_cost
                
                if cost_increase > self.alert_thresholds["cost_spike_threshold"]:
                    await self._create_alert(
                        AlertSeverity.HIGH,
                        "Cost Spike Detected",
                        f"Hourly cost increased by {(cost_increase-1)*100:.1f}%, from ${previous_cost:.2f} to ${current_cost:.2f}",
                        "cost_monitoring"
                    )
    
    async def _check_queue_depth(self, current_time: datetime):
        """Check job queue depth"""
        recent_queue_metrics = [m for m in self.metrics 
                               if m.name.startswith("coordinator.queue_depth") and 
                               current_time - m.timestamp < timedelta(minutes=5)]
        
        if recent_queue_metrics:
            current_queue_depth = recent_queue_metrics[-1].value
            
            if current_queue_depth > self.alert_thresholds["queue_depth"]:
                await self._create_alert(
                    AlertSeverity.MEDIUM,
                    "High Queue Depth",
                    f"Job queue depth is {current_queue_depth}, exceeding threshold of {self.alert_thresholds['queue_depth']}",
                    "queue_monitoring"
                )
    
    async def _check_error_rates(self, current_time: datetime):
        """Check system error rates"""
        recent_error_metrics = [m for m in self.metrics 
                               if "error" in m.name and 
                               current_time - m.timestamp < timedelta(minutes=10)]
        
        if recent_error_metrics:
            total_errors = sum(m.value for m in recent_error_metrics)
            total_requests = sum(m.value for m in self.metrics 
                               if "requests" in m.name and 
                               current_time - m.timestamp < timedelta(minutes=10))
            
            if total_requests > 0:
                error_rate = total_errors / total_requests
                
                if error_rate > self.alert_thresholds["error_rate"]:
                    await self._create_alert(
                        AlertSeverity.HIGH,
                        "High Error Rate",
                        f"System error rate is {error_rate:.2%}, exceeding threshold of {self.alert_thresholds['error_rate']:.2%}",
                        "error_monitoring"
                    )
    
    async def _create_alert(self, severity: AlertSeverity, title: str, description: str, source: str):
        """Create and handle a new alert"""
        alert_id = f"{source}_{int(time.time())}"
        
        # Check if similar alert already exists and is not resolved
        existing_alert = next((a for a in self.alerts 
                              if a.title == title and not a.resolved and 
                              datetime.utcnow() - a.timestamp < timedelta(hours=1)), None)
        
        if existing_alert:
            return  # Don't create duplicate alerts
        
        alert = Alert(
            id=alert_id,
            severity=severity,
            title=title,
            description=description,
            timestamp=datetime.utcnow(),
            source=source
        )
        
        self.alerts.append(alert)
        
        # Trigger alert handlers
        for handler in self.alert_handlers:
            try:
                await handler(alert)
            except Exception as e:
                logger.error(f"Alert handler error: {e}")
    
    async def _log_alert(self, alert: Alert):
        """Default alert handler - log to console"""
        logger.warning(f"ALERT [{alert.severity.value.upper()}] {alert.title}: {alert.description}")
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get current dashboard data"""
        current_time = datetime.utcnow()
        
        # Recent metrics (last hour)
        recent_metrics = [m for m in self.metrics 
                         if current_time - m.timestamp < timedelta(hours=1)]
        
        # Active alerts
        active_alerts = [a for a in self.alerts if not a.resolved]
        
        # Recent health checks
        recent_health = [h for h in self.health_checks 
                        if current_time - h.timestamp < timedelta(minutes=30)]
        
        return {
            "timestamp": current_time.isoformat(),
            "system_status": self._get_overall_status(recent_health),
            "metrics": {
                "total_count": len(recent_metrics),
                "by_source": self._group_metrics_by_source(recent_metrics)
            },
            "alerts": {
                "active_count": len(active_alerts),
                "by_severity": self._group_alerts_by_severity(active_alerts),
                "recent": [asdict(a) for a in active_alerts[-10:]]  # Last 10 alerts
            },
            "health_checks": {
                "services": {h.service: h.status for h in recent_health},
                "average_response_time": sum(h.response_time_ms for h in recent_health) / len(recent_health) if recent_health else 0
            }
        }
    
    def _get_overall_status(self, health_checks: List[HealthCheck]) -> str:
        """Determine overall system status"""
        if not health_checks:
            return "unknown"
        
        statuses = [h.status for h in health_checks]
        
        if "unhealthy" in statuses:
            return "unhealthy"
        elif "degraded" in statuses:
            return "degraded"
        else:
            return "healthy"
    
    def _group_metrics_by_source(self, metrics: List[Metric]) -> Dict[str, int]:
        """Group metrics by source"""
        sources = {}
        for metric in metrics:
            source = metric.labels.get("source", "unknown") if metric.labels else "unknown"
            sources[source] = sources.get(source, 0) + 1
        return sources
    
    def _group_alerts_by_severity(self, alerts: List[Alert]) -> Dict[str, int]:
        """Group alerts by severity"""
        severities = {}
        for alert in alerts:
            severity = alert.severity.value
            severities[severity] = severities.get(severity, 0) + 1
        return severities

class EmailAlertHandler:
    """Email alert handler"""
    
    def __init__(self, smtp_server: str, smtp_port: int, username: str, password: str, recipients: List[str]):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
        self.recipients = recipients
    
    async def __call__(self, alert: Alert):
        """Send email alert"""
        try:
            msg = MimeMultipart()
            msg['From'] = self.username
            msg['To'] = ', '.join(self.recipients)
            msg['Subject'] = f"[{alert.severity.value.upper()}] Followlytics Alert: {alert.title}"
            
            body = f"""
            Alert Details:
            - Severity: {alert.severity.value.upper()}
            - Title: {alert.title}
            - Description: {alert.description}
            - Source: {alert.source}
            - Timestamp: {alert.timestamp.isoformat()}
            - Alert ID: {alert.id}
            
            Please investigate and resolve this issue promptly.
            """
            
            msg.attach(MimeText(body, 'plain'))
            
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.username, self.password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email alert sent for {alert.id}")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")

async def start_monitoring_dashboard(coordinator_url: str = "http://localhost:8000"):
    """Start the monitoring dashboard"""
    dashboard = MonitoringDashboard(coordinator_url)
    
    try:
        await dashboard.initialize()
        
        # Add email alerts if configured
        email_config = {
            "smtp_server": os.getenv("SMTP_SERVER"),
            "smtp_port": int(os.getenv("SMTP_PORT", "587")),
            "username": os.getenv("SMTP_USERNAME"),
            "password": os.getenv("SMTP_PASSWORD"),
            "recipients": os.getenv("ALERT_RECIPIENTS", "").split(",")
        }
        
        if all(email_config.values()):
            email_handler = EmailAlertHandler(**email_config)
            dashboard.add_alert_handler(email_handler)
            logger.info("Email alerts configured")
        
        await dashboard.start_monitoring()
        
    finally:
        await dashboard.cleanup()

if __name__ == "__main__":
    import os
    coordinator_url = os.getenv("DAYTONA_COORDINATOR_URL", "http://localhost:8000")
    asyncio.run(start_monitoring_dashboard(coordinator_url))
