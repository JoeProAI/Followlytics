# Followlytics Enterprise Daytona Integration
"""
Daytona-powered enterprise scanning system for massive X follower tracking.
Provides distributed scanning, auto-scaling, cost optimization, and enterprise APIs.
"""

from .config import config, DaytonaConfig
from .client import DaytonaClient
from .coordinator import CoordinatorService, ScanJob, JobStatus
from .worker import FollowerWorker
from .snapshots import SnapshotManager

from .volume_manager import VolumeManager
from .resume_manager import ResumeManager, ResumeStrategy
from .auto_scaler import AutoScaler, ScalingMetrics, ScalingDecision
from .cost_optimizer import CostOptimizer, CostMetrics, OptimizationRecommendation
from .test_suite import MassiveScaleTestSuite, TestScenario, TestResult
from .deploy import DeploymentManager, deploy_followlytics_enterprise

__version__ = "1.0.0"
__author__ = "Followlytics Enterprise Team"

__all__ = [
    "config",
    "DaytonaConfig", 
    "DaytonaClient",
    "CoordinatorService",
    "ScanJob",
    "JobStatus",
    "FollowerWorker",
    "SnapshotManager",
    "VolumeManager",
    "ResumeManager",
    "ResumeStrategy",
    "AutoScaler",
    "ScalingMetrics",
    "ScalingDecision",
    "CostOptimizer",
    "CostMetrics",
    "OptimizationRecommendation",
    "MassiveScaleTestSuite",
    "TestScenario",
    "TestResult",
    "DeploymentManager",
    "deploy_followlytics_enterprise"
]
