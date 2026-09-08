"""Deterministic emergency resource-allocation simulation."""

from .domain_data import DEFAULT_PROFILE, IncidentProfile
from .models import Scenario, SimulationResult
from .risk import assess_risk


def simulate(
    scenario: Scenario,
    profile: IncidentProfile = DEFAULT_PROFILE,
) -> SimulationResult:
    """Simulate one scenario using the supplied incident-domain profile."""
    teams = scenario.resources.teams
    vehicles = scenario.resources.vehicles
    deployed_capacity = teams * profile.team_capacity + vehicles * profile.vehicle_capacity
    demand_covered = min(profile.total_demand, deployed_capacity)
    coverage_pct = demand_covered / profile.total_demand * 100

    if deployed_capacity == 0:
        resource_utilization_pct = 0.0
        capacity_ratio = 0.0
    else:
        resource_utilization_pct = demand_covered / deployed_capacity * 100
        capacity_ratio = deployed_capacity / profile.total_demand

    response_time_min = profile.min_response_time + (
        profile.base_response_time - profile.min_response_time
    ) / (
        1 + capacity_ratio
    )
    cost = (
        teams * profile.cost_per_team
        + vehicles * profile.cost_per_vehicle
        + profile.fixed_ops_cost
    )
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
            profile,
        ),
    )
