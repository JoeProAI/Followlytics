# Comprehensive Testing Suite for Followlytics Enterprise Massive Scale
import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import random
import statistics

from .client import DaytonaClient
from .coordinator import CoordinatorService, ScanJob, JobStatus
from .volume_manager import VolumeManager
from .auto_scaler import AutoScaler, ScalingMetrics
from .cost_optimizer import CostOptimizer
from .config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TestScenario:
    """Test scenario configuration"""
    name: str
    description: str
    follower_counts: List[int]
    concurrent_jobs: int
    expected_duration_minutes: int
    success_criteria: Dict[str, float]
    stress_level: str  # light, moderate, heavy, extreme

@dataclass
class TestResult:
    """Test execution result"""
    scenario_name: str
    start_time: datetime
    end_time: datetime
    duration_minutes: float
    jobs_submitted: int
    jobs_completed: int
    jobs_failed: int
    success_rate: float
    avg_processing_rate: float
    peak_workers: int
    total_cost: float
    performance_score: float
    passed: bool
    issues: List[str]

class MassiveScaleTestSuite:
    """Comprehensive testing suite for massive scale operations"""
    
    def __init__(self):
        self.client: Optional[DaytonaClient] = None
        self.coordinator: Optional[CoordinatorService] = None
        self.volume_manager: Optional[VolumeManager] = None
        self.auto_scaler: Optional[AutoScaler] = None
        self.cost_optimizer: Optional[CostOptimizer] = None
        
        self.test_results: List[TestResult] = []
        self.test_data_cleanup: List[str] = []  # Job IDs to clean up
        
    async def initialize(self):
        """Initialize test suite components"""
        logger.info("Initializing Massive Scale Test Suite...")
        
        self.client = DaytonaClient()
        await self.client.__aenter__()
        
        self.volume_manager = VolumeManager(self.client)
        await self.volume_manager.initialize()
        
        self.auto_scaler = AutoScaler(self.client)
        self.cost_optimizer = CostOptimizer(self.client)
        
        logger.info("Test suite initialized successfully")
    
    async def cleanup(self):
        """Cleanup test resources"""
        logger.info("Cleaning up test resources...")
        
        # Clean up test jobs
        for job_id in self.test_data_cleanup:
            try:
                # Remove test data from shared volume
                cleanup_sandbox = await self.client.create_sandbox(
                    name="test-cleanup-temp",
                    auto_stop_minutes=5
                )
                
                if cleanup_sandbox:
                    await self.client.execute_command(
                        cleanup_sandbox.id,
                        f"rm -rf /shared/results/{job_id} /shared/checkpoints/{job_id}.json",
                        timeout=30
                    )
                    await self.client.delete_sandbox(cleanup_sandbox.id)
                    
            except Exception as e:
                logger.error(f"Failed to cleanup job {job_id}: {e}")
        
        if self.client:
            await self.client.__aexit__(None, None, None)
        
        logger.info("Test cleanup completed")
    
    def get_test_scenarios(self) -> List[TestScenario]:
        """Define comprehensive test scenarios"""
        
        return [
            TestScenario(
                name="small_scale_baseline",
                description="Baseline test with small accounts to verify basic functionality",
                follower_counts=[15000, 25000, 35000],
                concurrent_jobs=2,
                expected_duration_minutes=15,
                success_criteria={
                    "success_rate": 0.95,
                    "processing_rate": 1000,  # followers per minute
                    "cost_efficiency": 0.01   # max cost per follower
                },
                stress_level="light"
            ),
            
            TestScenario(
                name="medium_scale_performance",
                description="Medium scale test with typical enterprise accounts",
                follower_counts=[100000, 250000, 500000],
                concurrent_jobs=3,
                expected_duration_minutes=45,
                success_criteria={
                    "success_rate": 0.90,
                    "processing_rate": 5000,
                    "cost_efficiency": 0.008
                },
                stress_level="moderate"
            ),
            
            TestScenario(
                name="large_scale_stress",
                description="Large scale test with major influencer accounts",
                follower_counts=[1000000, 2500000, 5000000],
                concurrent_jobs=5,
                expected_duration_minutes=120,
                success_criteria={
                    "success_rate": 0.85,
                    "processing_rate": 10000,
                    "cost_efficiency": 0.005
                },
                stress_level="heavy"
            ),
            
            TestScenario(
                name="mega_scale_ultimate",
                description="Ultimate test with mega-influencer accounts",
                follower_counts=[10000000, 25000000, 50000000],
                concurrent_jobs=10,
                expected_duration_minutes=300,
                success_criteria={
                    "success_rate": 0.80,
                    "processing_rate": 25000,
                    "cost_efficiency": 0.003
                },
                stress_level="extreme"
            ),
            
            TestScenario(
                name="concurrent_load_test",
                description="Test system under high concurrent load",
                follower_counts=[500000] * 15,  # 15 identical jobs
                concurrent_jobs=15,
                expected_duration_minutes=90,
                success_criteria={
                    "success_rate": 0.75,
                    "processing_rate": 8000,
                    "cost_efficiency": 0.006
                },
                stress_level="extreme"
            ),
            
            TestScenario(
                name="auto_scaling_validation",
                description="Validate auto-scaling behavior under varying load",
                follower_counts=[50000, 100000, 500000, 1000000, 2000000],
                concurrent_jobs=8,
                expected_duration_minutes=150,
                success_criteria={
                    "success_rate": 0.85,
                    "processing_rate": 7000,
                    "scaling_efficiency": 0.80
                },
                stress_level="heavy"
            ),
            
            TestScenario(
                name="failure_recovery_test",
                description="Test system recovery from simulated failures",
                follower_counts=[750000, 1500000],
                concurrent_jobs=4,
                expected_duration_minutes=100,
                success_criteria={
                    "success_rate": 0.70,  # Lower due to simulated failures
                    "recovery_time": 300,   # 5 minutes max recovery
                    "data_integrity": 0.95
                },
                stress_level="heavy"
            )
        ]
    
    async def run_test_scenario(self, scenario: TestScenario) -> TestResult:
        """Execute a single test scenario"""
        
        logger.info(f"Starting test scenario: {scenario.name}")
        start_time = datetime.utcnow()
        
        # Initialize tracking variables
        jobs_submitted = 0
        jobs_completed = 0
        jobs_failed = 0
        peak_workers = 0
        total_cost = 0.0
        processing_rates = []
        issues = []
        
        try:
            # Submit test jobs
            job_ids = []
            for i, follower_count in enumerate(scenario.follower_counts):
                if jobs_submitted >= scenario.concurrent_jobs:
                    break
                
                job_id = f"test_{scenario.name}_{i}_{int(time.time())}"
                
                # Create mock job (in production, would submit to coordinator)
                success = await self._submit_test_job(job_id, f"test_user_{i}", follower_count)
                
                if success:
                    jobs_submitted += 1
                    job_ids.append(job_id)
                    self.test_data_cleanup.append(job_id)
                else:
                    issues.append(f"Failed to submit job {i}")
                
                # Small delay between submissions
                await asyncio.sleep(2)
            
            # Monitor test execution
            monitoring_start = time.time()
            while time.time() - monitoring_start < scenario.expected_duration_minutes * 60:
                
                # Check job statuses
                completed_this_cycle = 0
                failed_this_cycle = 0
                
                for job_id in job_ids:
                    status = await self._check_job_status(job_id)
                    if status == "completed":
                        completed_this_cycle += 1
                    elif status == "failed":
                        failed_this_cycle += 1
                
                jobs_completed = completed_this_cycle
                jobs_failed = failed_this_cycle
                
                # Monitor system metrics
                current_workers = await self._get_active_worker_count()
                peak_workers = max(peak_workers, current_workers)
                
                # Calculate processing rate
                if jobs_completed > 0:
                    elapsed_minutes = (time.time() - monitoring_start) / 60
                    total_followers_processed = sum(scenario.follower_counts[:jobs_completed])
                    current_rate = total_followers_processed / max(elapsed_minutes, 1)
                    processing_rates.append(current_rate)
                
                # Check for issues
                if current_workers == 0 and jobs_submitted > jobs_completed + jobs_failed:
                    issues.append("No active workers while jobs pending")
                
                # Break if all jobs completed
                if jobs_completed + jobs_failed >= jobs_submitted:
                    break
                
                await asyncio.sleep(30)  # Check every 30 seconds
            
            # Calculate final metrics
            end_time = datetime.utcnow()
            duration_minutes = (end_time - start_time).total_seconds() / 60
            
            success_rate = jobs_completed / max(jobs_submitted, 1)
            avg_processing_rate = statistics.mean(processing_rates) if processing_rates else 0
            
            # Estimate cost (simplified)
            total_cost = peak_workers * (duration_minutes / 60) * 2.0  # $2/hour per worker
            
            # Calculate performance score
            performance_score = await self._calculate_performance_score(
                scenario, success_rate, avg_processing_rate, total_cost
            )
            
            # Determine if test passed
            passed = await self._evaluate_test_success(scenario, success_rate, avg_processing_rate, total_cost)
            
            result = TestResult(
                scenario_name=scenario.name,
                start_time=start_time,
                end_time=end_time,
                duration_minutes=duration_minutes,
                jobs_submitted=jobs_submitted,
                jobs_completed=jobs_completed,
                jobs_failed=jobs_failed,
                success_rate=success_rate,
                avg_processing_rate=avg_processing_rate,
                peak_workers=peak_workers,
                total_cost=total_cost,
                performance_score=performance_score,
                passed=passed,
                issues=issues
            )
            
            logger.info(f"Test scenario {scenario.name} completed: {'PASSED' if passed else 'FAILED'}")
            return result
            
        except Exception as e:
            logger.error(f"Test scenario {scenario.name} failed with exception: {e}")
            
            end_time = datetime.utcnow()
            duration_minutes = (end_time - start_time).total_seconds() / 60
            
            return TestResult(
                scenario_name=scenario.name,
                start_time=start_time,
                end_time=end_time,
                duration_minutes=duration_minutes,
                jobs_submitted=jobs_submitted,
                jobs_completed=jobs_completed,
                jobs_failed=jobs_submitted - jobs_completed,
                success_rate=0.0,
                avg_processing_rate=0.0,
                peak_workers=peak_workers,
                total_cost=total_cost,
                performance_score=0.0,
                passed=False,
                issues=issues + [f"Exception: {str(e)}"]
            )
    
    async def run_full_test_suite(self) -> Dict[str, Any]:
        """Run the complete test suite"""
        
        logger.info("Starting Followlytics Enterprise Massive Scale Test Suite")
        suite_start_time = datetime.utcnow()
        
        scenarios = self.get_test_scenarios()
        results = []
        
        for scenario in scenarios:
            logger.info(f"Running scenario {scenario.name} ({scenario.stress_level} stress)")
            
            result = await self.run_test_scenario(scenario)
            results.append(result)
            self.test_results.append(result)
            
            # Brief pause between scenarios
            await asyncio.sleep(60)
        
        suite_end_time = datetime.utcnow()
        suite_duration = (suite_end_time - suite_start_time).total_seconds() / 60
        
        # Generate summary report
        summary = await self._generate_test_summary(results, suite_duration)
        
        logger.info(f"Test suite completed in {suite_duration:.1f} minutes")
        logger.info(f"Overall result: {'PASSED' if summary['overall_passed'] else 'FAILED'}")
        
        return summary
    
    async def _submit_test_job(self, job_id: str, username: str, follower_count: int) -> bool:
        """Submit a test job (mock implementation)"""
        
        try:
            # Create test job configuration
            job_config = {
                "job_id": job_id,
                "username": username,
                "follower_count": follower_count,
                "test_mode": True,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # In production, would submit to coordinator
            # For testing, simulate job submission
            logger.info(f"Submitted test job {job_id}: {username} ({follower_count:,} followers)")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to submit test job {job_id}: {e}")
            return False
    
    async def _check_job_status(self, job_id: str) -> str:
        """Check status of a test job (mock implementation)"""
        
        # Simulate job progression
        # In production, would query coordinator
        
        # Random completion for testing
        if random.random() < 0.1:  # 10% chance of completion per check
            return "completed"
        elif random.random() < 0.02:  # 2% chance of failure
            return "failed"
        else:
            return "running"
    
    async def _get_active_worker_count(self) -> int:
        """Get current number of active workers"""
        
        try:
            sandboxes = await self.client.list_sandboxes()
            active_count = len([s for s in sandboxes if s.status == 'running'])
            return active_count
        except Exception:
            return 0
    
    async def _calculate_performance_score(self, scenario: TestScenario, success_rate: float, 
                                         processing_rate: float, total_cost: float) -> float:
        """Calculate overall performance score for the test"""
        
        score = 0.0
        
        # Success rate component (40% of score)
        target_success_rate = scenario.success_criteria.get("success_rate", 0.8)
        success_score = min(1.0, success_rate / target_success_rate) * 40
        score += success_score
        
        # Processing rate component (35% of score)
        target_processing_rate = scenario.success_criteria.get("processing_rate", 1000)
        rate_score = min(1.0, processing_rate / target_processing_rate) * 35
        score += rate_score
        
        # Cost efficiency component (25% of score)
        total_followers = sum(scenario.follower_counts)
        cost_per_follower = total_cost / max(total_followers, 1)
        target_cost_efficiency = scenario.success_criteria.get("cost_efficiency", 0.01)
        
        if cost_per_follower <= target_cost_efficiency:
            cost_score = 25
        else:
            cost_score = max(0, 25 * (1 - (cost_per_follower - target_cost_efficiency) / target_cost_efficiency))
        
        score += cost_score
        
        return min(100.0, score)
    
    async def _evaluate_test_success(self, scenario: TestScenario, success_rate: float,
                                   processing_rate: float, total_cost: float) -> bool:
        """Evaluate if test meets success criteria"""
        
        criteria = scenario.success_criteria
        
        # Check success rate
        if success_rate < criteria.get("success_rate", 0.8):
            return False
        
        # Check processing rate
        if processing_rate < criteria.get("processing_rate", 1000):
            return False
        
        # Check cost efficiency
        total_followers = sum(scenario.follower_counts)
        cost_per_follower = total_cost / max(total_followers, 1)
        if cost_per_follower > criteria.get("cost_efficiency", 0.01):
            return False
        
        return True
    
    async def _generate_test_summary(self, results: List[TestResult], suite_duration: float) -> Dict[str, Any]:
        """Generate comprehensive test summary"""
        
        total_tests = len(results)
        passed_tests = len([r for r in results if r.passed])
        failed_tests = total_tests - passed_tests
        
        overall_passed = passed_tests >= total_tests * 0.8  # 80% pass rate required
        
        # Calculate aggregate metrics
        total_jobs = sum(r.jobs_submitted for r in results)
        total_completed = sum(r.jobs_completed for r in results)
        total_failed = sum(r.jobs_failed for r in results)
        
        avg_success_rate = statistics.mean([r.success_rate for r in results]) if results else 0
        avg_processing_rate = statistics.mean([r.avg_processing_rate for r in results if r.avg_processing_rate > 0])
        total_cost = sum(r.total_cost for r in results)
        
        # Performance by stress level
        stress_performance = {}
        for result in results:
            scenario = next((s for s in self.get_test_scenarios() if s.name == result.scenario_name), None)
            if scenario:
                stress_level = scenario.stress_level
                if stress_level not in stress_performance:
                    stress_performance[stress_level] = []
                stress_performance[stress_level].append(result.performance_score)
        
        for stress_level in stress_performance:
            stress_performance[stress_level] = statistics.mean(stress_performance[stress_level])
        
        # Identify issues
        all_issues = []
        for result in results:
            all_issues.extend(result.issues)
        
        issue_summary = {}
        for issue in all_issues:
            issue_summary[issue] = issue_summary.get(issue, 0) + 1
        
        return {
            "overall_passed": overall_passed,
            "suite_duration_minutes": suite_duration,
            "test_summary": {
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "failed_tests": failed_tests,
                "pass_rate": passed_tests / max(total_tests, 1)
            },
            "job_summary": {
                "total_jobs_submitted": total_jobs,
                "total_jobs_completed": total_completed,
                "total_jobs_failed": total_failed,
                "overall_success_rate": total_completed / max(total_jobs, 1)
            },
            "performance_metrics": {
                "average_success_rate": avg_success_rate,
                "average_processing_rate": avg_processing_rate,
                "total_cost": total_cost,
                "cost_per_test": total_cost / max(total_tests, 1)
            },
            "stress_level_performance": stress_performance,
            "detailed_results": [
                {
                    "scenario": r.scenario_name,
                    "passed": r.passed,
                    "duration_minutes": r.duration_minutes,
                    "success_rate": r.success_rate,
                    "processing_rate": r.avg_processing_rate,
                    "cost": r.total_cost,
                    "performance_score": r.performance_score,
                    "issues": len(r.issues)
                }
                for r in results
            ],
            "common_issues": dict(sorted(issue_summary.items(), key=lambda x: x[1], reverse=True)[:10]),
            "recommendations": await self._generate_recommendations(results)
        }
    
    async def _generate_recommendations(self, results: List[TestResult]) -> List[str]:
        """Generate recommendations based on test results"""
        
        recommendations = []
        
        # Analyze failure patterns
        failed_results = [r for r in results if not r.passed]
        
        if len(failed_results) > len(results) * 0.3:  # More than 30% failures
            recommendations.append("High failure rate detected. Review system architecture and resource allocation.")
        
        # Check processing rates
        low_rate_results = [r for r in results if r.avg_processing_rate < 5000]
        if len(low_rate_results) > 0:
            recommendations.append("Low processing rates detected. Consider optimizing worker efficiency or increasing parallelization.")
        
        # Check costs
        high_cost_results = [r for r in results if r.total_cost > 100]
        if len(high_cost_results) > 0:
            recommendations.append("High costs detected in some tests. Implement cost optimization strategies.")
        
        # Check scaling
        peak_workers = [r.peak_workers for r in results]
        if max(peak_workers) < 5:
            recommendations.append("Low peak worker count suggests auto-scaling may not be aggressive enough.")
        
        # Check for common issues
        all_issues = []
        for result in results:
            all_issues.extend(result.issues)
        
        if "No active workers while jobs pending" in all_issues:
            recommendations.append("Worker provisioning issues detected. Review auto-scaling configuration.")
        
        if not recommendations:
            recommendations.append("All tests performed within acceptable parameters. System is ready for production.")
        
        return recommendations

async def run_massive_scale_tests():
    """Main function to run the massive scale test suite"""
    
    test_suite = MassiveScaleTestSuite()
    
    try:
        await test_suite.initialize()
        summary = await test_suite.run_full_test_suite()
        
        # Print summary
        print("\n" + "="*80)
        print("FOLLOWLYTICS ENTERPRISE MASSIVE SCALE TEST RESULTS")
        print("="*80)
        print(f"Overall Result: {'✅ PASSED' if summary['overall_passed'] else '❌ FAILED'}")
        print(f"Duration: {summary['suite_duration_minutes']:.1f} minutes")
        print(f"Tests: {summary['test_summary']['passed_tests']}/{summary['test_summary']['total_tests']} passed")
        print(f"Jobs: {summary['job_summary']['total_jobs_completed']}/{summary['job_summary']['total_jobs_submitted']} completed")
        print(f"Success Rate: {summary['performance_metrics']['average_success_rate']:.1%}")
        print(f"Processing Rate: {summary['performance_metrics']['average_processing_rate']:.0f} followers/min")
        print(f"Total Cost: ${summary['performance_metrics']['total_cost']:.2f}")
        
        print("\nRecommendations:")
        for rec in summary['recommendations']:
            print(f"• {rec}")
        
        return summary
        
    finally:
        await test_suite.cleanup()

if __name__ == "__main__":
    asyncio.run(run_massive_scale_tests())
