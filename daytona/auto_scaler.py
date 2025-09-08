# Auto-Scaling Logic for Followlytics Enterprise
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import math

from .client import DaytonaClient, SandboxInfo
from .config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ScalingDecision(Enum):
    """Auto-scaling decisions"""
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    MAINTAIN = "maintain"
    EMERGENCY_SCALE = "emergency_scale"

@dataclass
class ScalingMetrics:
    """Metrics used for scaling decisions"""
    active_jobs: int
    pending_jobs: int
    queue_depth: int
    active_workers: int
    idle_workers: int
    busy_workers: int
    avg_job_size: float
    avg_processing_rate: float
    current_utilization: float
    cost_per_hour: float
    credits_remaining: float
    peak_demand_forecast: int

@dataclass
class ScalingRecommendation:
    """Scaling recommendation with reasoning"""
    decision: ScalingDecision
    target_workers: int
    current_workers: int
    reasoning: str
    estimated_cost_impact: float
    urgency: str  # low, medium, high, critical
    confidence: float  # 0.0 to 1.0

class AutoScaler:
    """Intelligent auto-scaling for Daytona worker fleet"""
    
    def __init__(self, daytona_client: DaytonaClient):
        self.client = daytona_client
        self.min_workers = config.min_workers
        self.max_workers = config.max_concurrent_workers
        self.target_utilization = 0.75  # 75% target utilization
        self.scale_up_threshold = 0.85  # Scale up at 85% utilization
        self.scale_down_threshold = 0.40  # Scale down below 40% utilization
        
        # Historical data for better decisions
        self.metrics_history: List[ScalingMetrics] = []
        self.scaling_history: List[Dict[str, Any]] = []
        
        # Cost optimization parameters
        self.max_hourly_cost = config.max_hourly_spend
        self.cost_efficiency_threshold = 0.8  # Minimum cost efficiency
        
    async def analyze_scaling_needs(self, current_metrics: ScalingMetrics) -> ScalingRecommendation:
        """Analyze current system state and recommend scaling action"""
        
        # Store metrics for historical analysis
        self.metrics_history.append(current_metrics)
        if len(self.metrics_history) > 100:  # Keep last 100 data points
            self.metrics_history.pop(0)
        
        # Calculate optimal worker count
        optimal_workers = await self._calculate_optimal_workers(current_metrics)
        
        # Determine scaling decision
        decision = self._determine_scaling_decision(current_metrics, optimal_workers)
        
        # Calculate cost impact
        cost_impact = self._calculate_cost_impact(current_metrics.active_workers, optimal_workers)
        
        # Assess urgency and confidence
        urgency = self._assess_urgency(current_metrics, decision)
        confidence = self._calculate_confidence(current_metrics, decision)
        
        # Generate reasoning
        reasoning = self._generate_reasoning(current_metrics, optimal_workers, decision)
        
        recommendation = ScalingRecommendation(
            decision=decision,
            target_workers=optimal_workers,
            current_workers=current_metrics.active_workers,
            reasoning=reasoning,
            estimated_cost_impact=cost_impact,
            urgency=urgency,
            confidence=confidence
        )
        
        logger.info(f"Scaling recommendation: {decision.value} to {optimal_workers} workers (confidence: {confidence:.2f})")
        
        return recommendation
    
    async def _calculate_optimal_workers(self, metrics: ScalingMetrics) -> int:
        """Calculate optimal number of workers based on current demand"""
        
        # Base calculation on queue depth and job sizes
        if metrics.queue_depth > 0 and metrics.avg_job_size > 0:
            # Estimate workers needed for queue
            workers_for_queue = math.ceil(metrics.queue_depth * metrics.avg_job_size / 20000)  # 20K followers per worker
            
            # Add workers for active jobs
            workers_for_active = max(1, metrics.active_jobs)
            
            # Consider processing rate
            if metrics.avg_processing_rate > 0:
                time_to_clear_queue = metrics.queue_depth / max(metrics.avg_processing_rate, 0.1)
                if time_to_clear_queue > 2:  # More than 2 hours to clear queue
                    workers_for_queue = int(workers_for_queue * 1.5)  # Boost by 50%
            
            optimal = workers_for_queue + workers_for_active
        else:
            # Fallback to utilization-based calculation
            if metrics.current_utilization > self.target_utilization:
                optimal = math.ceil(metrics.active_workers * (metrics.current_utilization / self.target_utilization))
            else:
                optimal = max(self.min_workers, int(metrics.active_workers * 0.8))
        
        # Apply constraints
        optimal = max(self.min_workers, min(optimal, self.max_workers))
        
        # Cost constraint check
        estimated_cost = optimal * 2.0  # $2/hour per worker
        if estimated_cost > self.max_hourly_cost:
            optimal = int(self.max_hourly_cost / 2.0)
            logger.warning(f"Scaling limited by cost constraint: {optimal} workers (${estimated_cost:.2f}/hour)")
        
        # Peak demand forecasting
        if metrics.peak_demand_forecast > optimal:
            # Gradually scale up for predicted demand
            optimal = min(optimal + 2, metrics.peak_demand_forecast)
        
        return optimal
    
    def _determine_scaling_decision(self, metrics: ScalingMetrics, optimal_workers: int) -> ScalingDecision:
        """Determine what scaling action to take"""
        
        current_workers = metrics.active_workers
        difference = optimal_workers - current_workers
        
        # Emergency scaling conditions
        if metrics.queue_depth > 10 and metrics.current_utilization > 0.95:
            return ScalingDecision.EMERGENCY_SCALE
        
        if metrics.cost_per_hour > self.max_hourly_cost * 1.2:  # 20% over budget
            return ScalingDecision.EMERGENCY_SCALE
        
        # Normal scaling decisions
        if difference >= 2:  # Need at least 2 more workers
            return ScalingDecision.SCALE_UP
        elif difference <= -2:  # Can remove at least 2 workers
            # Check if we've been consistently under-utilized
            if self._is_consistently_underutilized():
                return ScalingDecision.SCALE_DOWN
        
        return ScalingDecision.MAINTAIN
    
    def _is_consistently_underutilized(self) -> bool:
        """Check if system has been consistently under-utilized"""
        if len(self.metrics_history) < 5:
            return False
        
        recent_metrics = self.metrics_history[-5:]  # Last 5 measurements
        underutilized_count = sum(1 for m in recent_metrics if m.current_utilization < self.scale_down_threshold)
        
        return underutilized_count >= 4  # 4 out of 5 measurements
    
    def _calculate_cost_impact(self, current_workers: int, target_workers: int) -> float:
        """Calculate the cost impact of scaling decision"""
        worker_diff = target_workers - current_workers
        hourly_cost_change = worker_diff * 2.0  # $2/hour per worker
        
        # Estimate daily impact (assuming 24 hours)
        daily_impact = hourly_cost_change * 24
        
        return daily_impact
    
    def _assess_urgency(self, metrics: ScalingMetrics, decision: ScalingDecision) -> str:
        """Assess the urgency of the scaling decision"""
        
        if decision == ScalingDecision.EMERGENCY_SCALE:
            return "critical"
        
        if decision == ScalingDecision.SCALE_UP:
            if metrics.queue_depth > 5:
                return "high"
            elif metrics.current_utilization > 0.9:
                return "high"
            else:
                return "medium"
        
        if decision == ScalingDecision.SCALE_DOWN:
            if metrics.cost_per_hour > self.max_hourly_cost:
                return "high"
            else:
                return "low"
        
        return "low"
    
    def _calculate_confidence(self, metrics: ScalingMetrics, decision: ScalingDecision) -> float:
        """Calculate confidence in the scaling decision"""
        confidence = 0.5  # Base confidence
        
        # Increase confidence based on data quality
        if len(self.metrics_history) >= 10:
            confidence += 0.2  # More historical data
        
        # Increase confidence for clear utilization patterns
        if metrics.current_utilization > 0.9 or metrics.current_utilization < 0.3:
            confidence += 0.2  # Clear over/under utilization
        
        # Increase confidence for consistent patterns
        if self._has_consistent_pattern():
            confidence += 0.2
        
        # Decrease confidence for volatile conditions
        if self._is_volatile_period():
            confidence -= 0.3
        
        # Emergency decisions have lower confidence due to reactive nature
        if decision == ScalingDecision.EMERGENCY_SCALE:
            confidence = min(confidence, 0.7)
        
        return max(0.1, min(1.0, confidence))
    
    def _has_consistent_pattern(self) -> bool:
        """Check if metrics show consistent patterns"""
        if len(self.metrics_history) < 5:
            return False
        
        recent_utilizations = [m.current_utilization for m in self.metrics_history[-5:]]
        
        # Check for consistent trend
        increasing = all(recent_utilizations[i] <= recent_utilizations[i+1] for i in range(len(recent_utilizations)-1))
        decreasing = all(recent_utilizations[i] >= recent_utilizations[i+1] for i in range(len(recent_utilizations)-1))
        
        return increasing or decreasing
    
    def _is_volatile_period(self) -> bool:
        """Check if we're in a volatile period with rapid changes"""
        if len(self.metrics_history) < 3:
            return False
        
        recent_utilizations = [m.current_utilization for m in self.metrics_history[-3:]]
        
        # Calculate variance
        mean_util = sum(recent_utilizations) / len(recent_utilizations)
        variance = sum((x - mean_util) ** 2 for x in recent_utilizations) / len(recent_utilizations)
        
        return variance > 0.1  # High variance indicates volatility
    
    def _generate_reasoning(self, metrics: ScalingMetrics, optimal_workers: int, decision: ScalingDecision) -> str:
        """Generate human-readable reasoning for the scaling decision"""
        
        reasoning_parts = []
        
        # Current state
        reasoning_parts.append(f"Current: {metrics.active_workers} workers, {metrics.current_utilization:.1%} utilization")
        
        # Queue analysis
        if metrics.queue_depth > 0:
            reasoning_parts.append(f"Queue: {metrics.queue_depth} jobs pending")
        
        # Decision reasoning
        if decision == ScalingDecision.SCALE_UP:
            if metrics.current_utilization > self.scale_up_threshold:
                reasoning_parts.append(f"High utilization ({metrics.current_utilization:.1%}) requires scaling up")
            if metrics.queue_depth > 3:
                reasoning_parts.append(f"Queue depth ({metrics.queue_depth}) indicates demand exceeds capacity")
        
        elif decision == ScalingDecision.SCALE_DOWN:
            if metrics.current_utilization < self.scale_down_threshold:
                reasoning_parts.append(f"Low utilization ({metrics.current_utilization:.1%}) allows scaling down")
            if metrics.idle_workers > 2:
                reasoning_parts.append(f"Multiple idle workers ({metrics.idle_workers}) can be removed")
        
        elif decision == ScalingDecision.EMERGENCY_SCALE:
            reasoning_parts.append("Emergency scaling triggered by critical conditions")
        
        elif decision == ScalingDecision.MAINTAIN:
            reasoning_parts.append("Current capacity matches demand adequately")
        
        # Cost considerations
        if metrics.cost_per_hour > self.max_hourly_cost * 0.8:
            reasoning_parts.append(f"Cost approaching limit (${metrics.cost_per_hour:.2f}/hour)")
        
        return "; ".join(reasoning_parts)
    
    async def execute_scaling_decision(self, recommendation: ScalingRecommendation) -> bool:
        """Execute the scaling decision"""
        
        if recommendation.decision == ScalingDecision.MAINTAIN:
            logger.info("Maintaining current worker count")
            return True
        
        try:
            current_workers = recommendation.current_workers
            target_workers = recommendation.target_workers
            
            if recommendation.decision in [ScalingDecision.SCALE_UP, ScalingDecision.EMERGENCY_SCALE]:
                workers_to_add = target_workers - current_workers
                success = await self._scale_up_workers(workers_to_add)
                
            elif recommendation.decision == ScalingDecision.SCALE_DOWN:
                workers_to_remove = current_workers - target_workers
                success = await self._scale_down_workers(workers_to_remove)
            
            else:
                success = False
            
            # Record scaling action
            self.scaling_history.append({
                "timestamp": datetime.utcnow().isoformat(),
                "decision": recommendation.decision.value,
                "from_workers": current_workers,
                "to_workers": target_workers,
                "success": success,
                "reasoning": recommendation.reasoning,
                "cost_impact": recommendation.estimated_cost_impact
            })
            
            # Keep history manageable
            if len(self.scaling_history) > 50:
                self.scaling_history.pop(0)
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to execute scaling decision: {e}")
            return False
    
    async def _scale_up_workers(self, count: int) -> bool:
        """Scale up by adding workers"""
        logger.info(f"Scaling up by {count} workers")
        
        successful_creates = 0
        
        for i in range(count):
            try:
                worker_name = f"followlytics-worker-auto-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{i}"
                
                sandbox = await self.client.create_sandbox(
                    name=worker_name,
                    image="python:3.11-slim",  # Will use custom snapshot in production
                    env_vars={
                        "WORKER_TYPE": "auto_scaled",
                        "CREATED_BY": "auto_scaler",
                        "PYTHONPATH": "/worker"
                    },
                    auto_stop_minutes=config.auto_stop_interval_minutes
                )
                
                if sandbox:
                    successful_creates += 1
                    logger.info(f"Created worker: {sandbox.id}")
                    
                    # Small delay between creates to avoid overwhelming the system
                    await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"Failed to create worker {i+1}/{count}: {e}")
        
        success_rate = successful_creates / count if count > 0 else 0
        logger.info(f"Scale up completed: {successful_creates}/{count} workers created ({success_rate:.1%} success)")
        
        return success_rate > 0.5  # Consider successful if >50% workers created
    
    async def _scale_down_workers(self, count: int) -> bool:
        """Scale down by removing idle workers"""
        logger.info(f"Scaling down by {count} workers")
        
        # Get current sandboxes
        sandboxes = await self.client.list_sandboxes()
        
        # Find idle workers (those created by auto-scaler)
        idle_workers = []
        for sandbox in sandboxes:
            if "auto" in sandbox.name.lower() and sandbox.status == "running":
                idle_workers.append(sandbox)
        
        # Sort by creation time (remove oldest first)
        idle_workers.sort(key=lambda x: x.created_at)
        
        workers_to_remove = idle_workers[:count]
        successful_removals = 0
        
        for worker in workers_to_remove:
            try:
                await self.client.stop_sandbox(worker.id)
                successful_removals += 1
                logger.info(f"Stopped worker: {worker.id}")
                
                # Small delay between stops
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Failed to stop worker {worker.id}: {e}")
        
        success_rate = successful_removals / count if count > 0 else 0
        logger.info(f"Scale down completed: {successful_removals}/{count} workers stopped ({success_rate:.1%} success)")
        
        return success_rate > 0.5
    
    def get_scaling_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent scaling history"""
        return self.scaling_history[-limit:]
    
    def get_scaling_statistics(self) -> Dict[str, Any]:
        """Get scaling statistics and performance metrics"""
        
        if not self.scaling_history:
            return {"message": "No scaling history available"}
        
        total_actions = len(self.scaling_history)
        successful_actions = sum(1 for action in self.scaling_history if action.get("success", False))
        
        scale_up_actions = sum(1 for action in self.scaling_history if "scale_up" in action.get("decision", ""))
        scale_down_actions = sum(1 for action in self.scaling_history if "scale_down" in action.get("decision", ""))
        
        total_cost_impact = sum(action.get("cost_impact", 0) for action in self.scaling_history)
        
        return {
            "total_scaling_actions": total_actions,
            "success_rate": successful_actions / total_actions if total_actions > 0 else 0,
            "scale_up_actions": scale_up_actions,
            "scale_down_actions": scale_down_actions,
            "total_cost_impact": total_cost_impact,
            "avg_cost_impact_per_action": total_cost_impact / total_actions if total_actions > 0 else 0,
            "recent_actions": self.scaling_history[-5:] if self.scaling_history else []
        }
