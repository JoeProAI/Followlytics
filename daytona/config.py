# Daytona Configuration for Followlytics Enterprise
import os
from dataclasses import dataclass
from typing import Optional

@dataclass
class DaytonaConfig:
    """Daytona configuration for Followlytics Enterprise"""
    
    # Provided credentials
    organization_id: str = "d28a2d43-bac2-44c6-9e38-7ed2b08addd9"
    api_key: str = "dtn_30f485a820500d1c393ac4bfcac84be84ce23f87d79b5ba5a8e20f364d4ba567"
    api_url: str = "https://app.daytona.io/api"
    
    # Default configuration
    target_region: str = "us"  # Can be changed to "eu" if needed
    
    # Resource limits
    max_concurrent_workers: int = 50
    max_memory_per_worker: int = 8  # GB
    max_cpu_per_worker: int = 4
    max_disk_per_worker: int = 50  # GB
    
    # Auto-scaling configuration
    workers_per_20k_followers: int = 1
    min_workers: int = 1
    max_idle_time_minutes: int = 5
    
    # Cost optimization
    max_hourly_spend: float = 50.0  # USD
    auto_stop_interval_minutes: int = 30
    
    # Shared storage
    shared_volume_size_gb: int = 1000  # 1TB
    
    @classmethod
    def from_env(cls) -> 'DaytonaConfig':
        """Create config from environment variables with fallbacks"""
        return cls(
            organization_id=os.getenv('DAYTONA_ORG_ID', cls.organization_id),
            api_key=os.getenv('DAYTONA_API_KEY', cls.api_key),
            api_url=os.getenv('DAYTONA_API_URL', cls.api_url),
            target_region=os.getenv('DAYTONA_REGION', cls.target_region),
            max_concurrent_workers=int(os.getenv('DAYTONA_MAX_WORKERS', cls.max_concurrent_workers)),
            max_hourly_spend=float(os.getenv('DAYTONA_MAX_HOURLY_SPEND', cls.max_hourly_spend))
        )
    
    def to_env_vars(self) -> dict:
        """Convert config to environment variables"""
        return {
            'DAYTONA_ORG_ID': self.organization_id,
            'DAYTONA_API_KEY': self.api_key,
            'DAYTONA_API_URL': self.api_url,
            'DAYTONA_REGION': self.target_region,
            'DAYTONA_MAX_WORKERS': str(self.max_concurrent_workers),
            'DAYTONA_MAX_HOURLY_SPEND': str(self.max_hourly_spend)
        }

# Global config instance
config = DaytonaConfig.from_env()
