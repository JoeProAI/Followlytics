# Cost Optimization and Resource Monitoring for Followlytics Enterprise
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import statistics

from .client import DaytonaClient
from .config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CostAlert(Enum):
    """Cost alert levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class CostMetrics:
    """Cost and resource metrics"""
    current_hourly_cost: float
    daily_cost_projection: float
    monthly_cost_projection: float
    credits_remaining: float
    credits_used_today: float
    active_sandboxes: int
    total_cpu_hours: float
    total_memory_gb_hours: float
    cost_per_follower: float
    efficiency_score: float
    waste_percentage: float

@dataclass
class OptimizationRecommendation:
    """Cost optimization recommendation"""
    action: str
    description: str
    estimated_savings: float
    impact_level: str  # low, medium, high
    implementation_effort: str  # easy, moderate, complex
    priority: int  # 1-10, 10 being highest priority

@dataclass
class ResourceUsage:
    """Resource usage statistics"""
    sandbox_id: str
    cpu_utilization: float
    memory_utilization: float
    disk_utilization: float
    network_usage: float
    uptime_hours: float
    cost_per_hour: float
    efficiency_rating: str

class CostOptimizer:
    """Advanced cost optimization and resource monitoring"""
    
    def __init__(self, daytona_client: DaytonaClient):
        self.client = daytona_client
        self.cost_history: List[CostMetrics] = []
        self.optimization_history: List[Dict[str, Any]] = []
        
        # Cost thresholds
        self.daily_budget = config.max_hourly_spend * 24
        self.monthly_budget = self.daily_budget * 30
        self.efficiency_threshold = 0.75  # 75% minimum efficiency
        self.waste_threshold = 0.15  # 15% maximum waste
        
        # Alert thresholds
        self.alert_thresholds = {
            CostAlert.LOW: 0.7,      # 70% of budget
            CostAlert.MEDIUM: 0.85,  # 85% of budget
            CostAlert.HIGH: 0.95,    # 95% of budget
            CostAlert.CRITICAL: 1.0  # 100% of budget
        }
    
    async def analyze_costs(self) -> CostMetrics:
        """Analyze current cost and resource usage"""
        
        # Get usage statistics from Daytona
        usage_stats = await self.client.get_usage_stats()
        
        current_hourly_cost = usage_stats.get('current_hourly_cost', 0)
        daily_projection = current_hourly_cost * 24
        monthly_projection = daily_projection * 30
        
        credits_remaining = usage_stats.get('credits_remaining', 0)
        credits_used_today = self._calculate_daily_credits_used()
        
        # Calculate efficiency metrics
        efficiency_score = await self._calculate_efficiency_score(usage_stats)
        waste_percentage = await self._calculate_waste_percentage()
        cost_per_follower = await self._calculate_cost_per_follower()
        
        metrics = CostMetrics(
            current_hourly_cost=current_hourly_cost,
            daily_cost_projection=daily_projection,
            monthly_cost_projection=monthly_projection,
            credits_remaining=credits_remaining,
            credits_used_today=credits_used_today,
            active_sandboxes=usage_stats.get('active_sandboxes', 0),
            total_cpu_hours=usage_stats.get('total_cpu_hours', 0),
            total_memory_gb_hours=usage_stats.get('total_memory_gb_hours', 0),
            cost_per_follower=cost_per_follower,
            efficiency_score=efficiency_score,
            waste_percentage=waste_percentage
        )
        
        # Store for historical analysis
        self.cost_history.append(metrics)
        if len(self.cost_history) > 168:  # Keep 1 week of hourly data
            self.cost_history.pop(0)
        
        return metrics
    
    async def generate_optimization_recommendations(self, metrics: CostMetrics) -> List[OptimizationRecommendation]:
        """Generate cost optimization recommendations"""
        
        recommendations = []
        
        # High cost per hour
        if metrics.current_hourly_cost > config.max_hourly_spend:
            recommendations.append(OptimizationRecommendation(
                action="reduce_active_workers",
                description=f"Current hourly cost (${metrics.current_hourly_cost:.2f}) exceeds budget (${config.max_hourly_spend:.2f}). Consider reducing active workers.",
                estimated_savings=(metrics.current_hourly_cost - config.max_hourly_spend) * 24,
                impact_level="high",
                implementation_effort="easy",
                priority=10
            ))
        
        # Low efficiency
        if metrics.efficiency_score < self.efficiency_threshold:
            recommendations.append(OptimizationRecommendation(
                action="optimize_resource_allocation",
                description=f"System efficiency ({metrics.efficiency_score:.1%}) is below target ({self.efficiency_threshold:.1%}). Optimize worker resource allocation.",
                estimated_savings=metrics.daily_cost_projection * 0.2,  # 20% potential savings
                impact_level="medium",
                implementation_effort="moderate",
                priority=7
            ))
        
        # High waste percentage
        if metrics.waste_percentage > self.waste_threshold:
            recommendations.append(OptimizationRecommendation(
                action="eliminate_idle_resources",
                description=f"Resource waste ({metrics.waste_percentage:.1%}) exceeds threshold ({self.waste_threshold:.1%}). Eliminate idle sandboxes.",
                estimated_savings=metrics.daily_cost_projection * metrics.waste_percentage,
                impact_level="medium",
                implementation_effort="easy",
                priority=8
            ))
        
        # Expensive cost per follower
        if metrics.cost_per_follower > 0.01:  # $0.01 per follower threshold
            recommendations.append(OptimizationRecommendation(
                action="improve_processing_efficiency",
                description=f"Cost per follower (${metrics.cost_per_follower:.4f}) is high. Improve processing efficiency or batch sizes.",
                estimated_savings=metrics.daily_cost_projection * 0.15,
                impact_level="medium",
                implementation_effort="moderate",
                priority=6
            ))
        
        # Auto-stop optimization
        idle_sandboxes = await self._find_idle_sandboxes()
        if len(idle_sandboxes) > 2:
            potential_savings = len(idle_sandboxes) * 2.0 * 24  # $2/hour * 24 hours
            recommendations.append(OptimizationRecommendation(
                action="implement_aggressive_auto_stop",
                description=f"Found {len(idle_sandboxes)} idle sandboxes. Implement more aggressive auto-stop policies.",
                estimated_savings=potential_savings,
                impact_level="high",
                implementation_effort="easy",
                priority=9
            ))
        
        # Resource right-sizing
        oversized_sandboxes = await self._find_oversized_sandboxes()
        if oversized_sandboxes:
            recommendations.append(OptimizationRecommendation(
                action="rightsize_worker_resources",
                description=f"Found {len(oversized_sandboxes)} oversized sandboxes. Right-size CPU/memory allocation.",
                estimated_savings=metrics.daily_cost_projection * 0.25,
                impact_level="medium",
                implementation_effort="moderate",
                priority=5
            ))
        
        # Peak hour optimization
        if await self._has_peak_hour_waste():
            recommendations.append(OptimizationRecommendation(
                action="implement_peak_hour_scheduling",
                description="Optimize job scheduling to avoid peak pricing hours and improve resource utilization.",
                estimated_savings=metrics.daily_cost_projection * 0.1,
                impact_level="low",
                implementation_effort="complex",
                priority=3
            ))
        
        # Sort by priority
        recommendations.sort(key=lambda x: x.priority, reverse=True)
        
        return recommendations
    
    async def check_cost_alerts(self, metrics: CostMetrics) -> List[Dict[str, Any]]:
        """Check for cost alerts and generate notifications"""
        
        alerts = []
        
        # Daily budget alerts
        daily_usage_ratio = metrics.daily_cost_projection / self.daily_budget
        
        for alert_level, threshold in self.alert_thresholds.items():
            if daily_usage_ratio >= threshold:
                alerts.append({
                    "level": alert_level.value,
                    "type": "daily_budget",
                    "message": f"Daily cost projection (${metrics.daily_cost_projection:.2f}) is {daily_usage_ratio:.1%} of budget (${self.daily_budget:.2f})",
                    "current_value": metrics.daily_cost_projection,
                    "threshold_value": self.daily_budget * threshold,
                    "recommended_action": self._get_alert_action(alert_level)
                })
                break  # Only send highest level alert
        
        # Credits depletion alert
        if metrics.credits_remaining < 1000:  # Less than $1000 credits
            alerts.append({
                "level": CostAlert.HIGH.value,
                "type": "credits_low",
                "message": f"Credits running low: ${metrics.credits_remaining:.2f} remaining",
                "current_value": metrics.credits_remaining,
                "threshold_value": 1000,
                "recommended_action": "Add more credits or reduce resource usage"
            })
        
        # Efficiency alerts
        if metrics.efficiency_score < 0.5:  # Very low efficiency
            alerts.append({
                "level": CostAlert.MEDIUM.value,
                "type": "low_efficiency",
                "message": f"System efficiency very low: {metrics.efficiency_score:.1%}",
                "current_value": metrics.efficiency_score,
                "threshold_value": 0.75,
                "recommended_action": "Review resource allocation and eliminate waste"
            })
        
        # Waste alerts
        if metrics.waste_percentage > 0.3:  # 30% waste
            alerts.append({
                "level": CostAlert.HIGH.value,
                "type": "high_waste",
                "message": f"High resource waste detected: {metrics.waste_percentage:.1%}",
                "current_value": metrics.waste_percentage,
                "threshold_value": 0.15,
                "recommended_action": "Stop idle sandboxes and optimize resource usage"
            })
        
        return alerts
    
    async def implement_optimization(self, recommendation: OptimizationRecommendation) -> bool:
        """Implement a cost optimization recommendation"""
        
        logger.info(f"Implementing optimization: {recommendation.action}")
        
        try:
            if recommendation.action == "reduce_active_workers":
                return await self._reduce_active_workers()
            
            elif recommendation.action == "eliminate_idle_resources":
                return await self._eliminate_idle_resources()
            
            elif recommendation.action == "implement_aggressive_auto_stop":
                return await self._implement_aggressive_auto_stop()
            
            elif recommendation.action == "rightsize_worker_resources":
                return await self._rightsize_worker_resources()
            
            elif recommendation.action == "optimize_resource_allocation":
                return await self._optimize_resource_allocation()
            
            else:
                logger.warning(f"Unknown optimization action: {recommendation.action}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to implement optimization {recommendation.action}: {e}")
            return False
    
    async def _calculate_efficiency_score(self, usage_stats: Dict[str, Any]) -> float:
        """Calculate system efficiency score"""
        
        active_sandboxes = usage_stats.get('active_sandboxes', 0)
        if active_sandboxes == 0:
            return 1.0
        
        # Get individual sandbox utilization
        sandboxes = await self.client.list_sandboxes()
        
        utilization_scores = []
        for sandbox in sandboxes:
            if sandbox.status == 'running':
                # Simplified utilization calculation
                # In production, would get actual CPU/memory metrics
                utilization = 0.7  # Placeholder - would be actual utilization
                utilization_scores.append(utilization)
        
        if not utilization_scores:
            return 1.0
        
        return statistics.mean(utilization_scores)
    
    async def _calculate_waste_percentage(self) -> float:
        """Calculate resource waste percentage"""
        
        sandboxes = await self.client.list_sandboxes()
        
        total_sandboxes = len(sandboxes)
        idle_sandboxes = len([s for s in sandboxes if s.status in ['stopped', 'idle']])
        
        if total_sandboxes == 0:
            return 0.0
        
        return idle_sandboxes / total_sandboxes
    
    async def _calculate_cost_per_follower(self) -> float:
        """Calculate average cost per follower processed"""
        
        if not self.cost_history:
            return 0.0
        
        # Simplified calculation - would use actual follower processing data
        recent_cost = self.cost_history[-1].current_hourly_cost if self.cost_history else 0
        estimated_followers_per_hour = 50000  # Placeholder
        
        if estimated_followers_per_hour == 0:
            return 0.0
        
        return recent_cost / estimated_followers_per_hour
    
    def _calculate_daily_credits_used(self) -> float:
        """Calculate credits used today"""
        
        if len(self.cost_history) < 24:  # Less than 24 hours of data
            return 0.0
        
        # Sum last 24 hours of costs
        recent_costs = [m.current_hourly_cost for m in self.cost_history[-24:]]
        return sum(recent_costs)
    
    async def _find_idle_sandboxes(self) -> List[str]:
        """Find sandboxes that are idle and can be stopped"""
        
        sandboxes = await self.client.list_sandboxes()
        idle_sandboxes = []
        
        for sandbox in sandboxes:
            if sandbox.status == 'running':
                # Check if sandbox has been idle (simplified check)
                # In production, would check actual activity metrics
                created_time = datetime.fromisoformat(sandbox.created_at.replace('Z', '+00:00'))
                if datetime.utcnow() - created_time.replace(tzinfo=None) > timedelta(minutes=30):
                    idle_sandboxes.append(sandbox.id)
        
        return idle_sandboxes
    
    async def _find_oversized_sandboxes(self) -> List[str]:
        """Find sandboxes with excessive resource allocation"""
        
        sandboxes = await self.client.list_sandboxes()
        oversized = []
        
        for sandbox in sandboxes:
            resources = sandbox.resources
            if resources:
                # Check if resources are oversized for typical workload
                cpu = resources.get('cpu', 0)
                memory = resources.get('memory', 0)
                
                if cpu > 4 or memory > 8:  # More than 4 CPU or 8GB RAM
                    oversized.append(sandbox.id)
        
        return oversized
    
    async def _has_peak_hour_waste(self) -> bool:
        """Check if there's waste during peak hours"""
        
        if len(self.cost_history) < 24:
            return False
        
        # Analyze cost patterns over 24 hours
        hourly_costs = [m.current_hourly_cost for m in self.cost_history[-24:]]
        
        # Simple peak detection - costs vary significantly
        if max(hourly_costs) > min(hourly_costs) * 2:
            return True
        
        return False
    
    def _get_alert_action(self, alert_level: CostAlert) -> str:
        """Get recommended action for alert level"""
        
        actions = {
            CostAlert.LOW: "Monitor usage closely",
            CostAlert.MEDIUM: "Consider reducing non-essential workers",
            CostAlert.HIGH: "Immediately reduce active workers",
            CostAlert.CRITICAL: "Emergency shutdown of non-critical resources"
        }
        
        return actions.get(alert_level, "Review resource usage")
    
    async def _reduce_active_workers(self) -> bool:
        """Reduce number of active workers"""
        
        sandboxes = await self.client.list_sandboxes()
        running_sandboxes = [s for s in sandboxes if s.status == 'running']
        
        # Stop 25% of running sandboxes
        workers_to_stop = max(1, len(running_sandboxes) // 4)
        
        stopped_count = 0
        for sandbox in running_sandboxes[:workers_to_stop]:
            try:
                await self.client.stop_sandbox(sandbox.id)
                stopped_count += 1
            except Exception as e:
                logger.error(f"Failed to stop sandbox {sandbox.id}: {e}")
        
        logger.info(f"Stopped {stopped_count}/{workers_to_stop} workers for cost reduction")
        return stopped_count > 0
    
    async def _eliminate_idle_resources(self) -> bool:
        """Stop all idle resources"""
        
        idle_sandboxes = await self._find_idle_sandboxes()
        
        stopped_count = 0
        for sandbox_id in idle_sandboxes:
            try:
                await self.client.stop_sandbox(sandbox_id)
                stopped_count += 1
            except Exception as e:
                logger.error(f"Failed to stop idle sandbox {sandbox_id}: {e}")
        
        logger.info(f"Stopped {stopped_count} idle sandboxes")
        return stopped_count > 0
    
    async def _implement_aggressive_auto_stop(self) -> bool:
        """Implement more aggressive auto-stop policies"""
        
        # This would modify sandbox auto-stop intervals
        # For now, just log the action
        logger.info("Implementing aggressive auto-stop policies")
        
        # In production, would update sandbox configurations
        # to have shorter auto-stop intervals
        
        return True
    
    async def _rightsize_worker_resources(self) -> bool:
        """Right-size worker resource allocation"""
        
        oversized_sandboxes = await self._find_oversized_sandboxes()
        
        # This would require recreating sandboxes with smaller resources
        # For now, just log the recommendation
        logger.info(f"Identified {len(oversized_sandboxes)} oversized sandboxes for right-sizing")
        
        return len(oversized_sandboxes) > 0
    
    async def _optimize_resource_allocation(self) -> bool:
        """Optimize overall resource allocation"""
        
        # This would implement various resource optimization strategies
        logger.info("Optimizing resource allocation")
        
        # Combine multiple optimization strategies
        success_count = 0
        
        if await self._eliminate_idle_resources():
            success_count += 1
        
        if await self._implement_aggressive_auto_stop():
            success_count += 1
        
        return success_count > 0
    
    def get_cost_report(self, days: int = 7) -> Dict[str, Any]:
        """Generate comprehensive cost report"""
        
        if not self.cost_history:
            return {"message": "No cost data available"}
        
        # Get recent data
        recent_data = self.cost_history[-days*24:] if len(self.cost_history) >= days*24 else self.cost_history
        
        if not recent_data:
            return {"message": "Insufficient cost data"}
        
        # Calculate statistics
        hourly_costs = [m.current_hourly_cost for m in recent_data]
        daily_costs = [m.daily_cost_projection for m in recent_data]
        efficiency_scores = [m.efficiency_score for m in recent_data]
        
        return {
            "period_days": days,
            "total_cost": sum(hourly_costs),
            "average_hourly_cost": statistics.mean(hourly_costs),
            "peak_hourly_cost": max(hourly_costs),
            "average_daily_projection": statistics.mean(daily_costs),
            "average_efficiency": statistics.mean(efficiency_scores),
            "cost_trend": "increasing" if hourly_costs[-1] > hourly_costs[0] else "decreasing",
            "credits_remaining": recent_data[-1].credits_remaining,
            "current_waste_percentage": recent_data[-1].waste_percentage,
            "optimization_opportunities": 0  # Will be calculated separately in async context
        }
