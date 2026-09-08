"""Incident-specific domain profiles for the pure DecisionOS engine."""

from dataclasses import dataclass


@dataclass(frozen=True)
class IncidentProfile:
    """Fixed operational constants for one incident-planning domain."""

    name: str
    total_demand: int
    team_capacity: int
    vehicle_capacity: int
    min_response_time: float
    base_response_time: float
    cost_per_team: float
    cost_per_vehicle: float
    fixed_ops_cost: float
    min_coverage_pct: float


EMERGENCY_RESPONSE_PROFILE = IncidentProfile(
    name="emergency response",
    total_demand=400,
    team_capacity=20,
    vehicle_capacity=15,
    min_response_time=8,
    base_response_time=55,
    cost_per_team=30000,
    cost_per_vehicle=15000,
    fixed_ops_cost=50000,
    min_coverage_pct=60,
)

DELIVERY_FLEET_CAPACITY_PLANNING_PROFILE = IncidentProfile(
    name="delivery fleet capacity planning",
    total_demand=1_200,
    team_capacity=80,
    vehicle_capacity=50,
    min_response_time=20,
    base_response_time=180,
    cost_per_team=12_000,
    cost_per_vehicle=8_000,
    fixed_ops_cost=25_000,
    min_coverage_pct=70,
)

INCIDENT_PROFILES = {
    "emergency_response": EMERGENCY_RESPONSE_PROFILE,
    "delivery_fleet_capacity_planning": DELIVERY_FLEET_CAPACITY_PLANNING_PROFILE,
}

DEFAULT_PROFILE = EMERGENCY_RESPONSE_PROFILE

# Backward-compatible aliases for existing engine consumers.
TOTAL_DEMAND = DEFAULT_PROFILE.total_demand
TEAM_CAPACITY = DEFAULT_PROFILE.team_capacity
VEHICLE_CAPACITY = DEFAULT_PROFILE.vehicle_capacity
MIN_RESPONSE_TIME = DEFAULT_PROFILE.min_response_time
BASE_RESPONSE_TIME = DEFAULT_PROFILE.base_response_time
COST_PER_TEAM = DEFAULT_PROFILE.cost_per_team
COST_PER_VEHICLE = DEFAULT_PROFILE.cost_per_vehicle
FIXED_OPS_COST = DEFAULT_PROFILE.fixed_ops_cost
MIN_COVERAGE_PCT = DEFAULT_PROFILE.min_coverage_pct
