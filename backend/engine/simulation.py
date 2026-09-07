"""Deterministic emergency resource-allocation simulation."""

from .domain_data import (
    BASE_RESPONSE_TIME,
    COST_PER_TEAM,
    COST_PER_VEHICLE,
    FIXED_OPS_COST,
    MIN_RESPONSE_TIME,
    TEAM_CAPACITY,
    TOTAL_DEMAND,
    VEHICLE_CAPACITY,
)
from .models import Scenario, SimulationResult
from .risk import assess_risk


def simulate(scenario: Scenario) -> SimulationResult:
    """Simulate one scenario using the fixed emergency-response domain model."""
    teams = scenario.resources.teams
    vehicles = scenario.resources.vehicles
    deployed_capacity = teams * TEAM_CAPACITY + vehicles * VEHICLE_CAPACITY
    demand_covered = min(TOTAL_DEMAND, deployed_capacity)
    coverage_pct = demand_covered / TOTAL_DEMAND * 100

    if deployed_capacity == 0:
        resource_utilization_pct = 0.0
        capacity_ratio = 0.0
    else:
        resource_utilization_pct = demand_covered / deployed_capacity * 100
        capacity_ratio = deployed_capacity / TOTAL_DEMAND

    response_time_min = MIN_RESPONSE_TIME + (BASE_RESPONSE_TIME - MIN_RESPONSE_TIME) / (
        1 + capacity_ratio
    )
    cost = teams * COST_PER_TEAM + vehicles * COST_PER_VEHICLE + FIXED_OPS_COST
    hard_constraints_failed = (
        cost > scenario.resources.budget
        or response_time_min > scenario.constraints.deadline_min
        or coverage_pct < scenario.constraints.min_coverage_pct
    )

    return SimulationResult(
        response_time_min=response_time_min,
        cost=cost,
        coverage_pct=coverage_pct,
        resource_utilization_pct=resource_utilization_pct,
        demand_covered=demand_covered,
        risk=assess_risk(
            response_time_min,
            coverage_pct,
            scenario.constraints.deadline_min,
            hard_constraints_failed,
        ),
    )
