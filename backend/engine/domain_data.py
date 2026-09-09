"""Incident-domain profiles for deterministic resource-allocation simulations."""

from dataclasses import dataclass


@dataclass(frozen=True)
class IncidentProfile:
    total_demand: float
    team_capacity: float
    vehicle_capacity: float
    min_response_time: float
    base_response_time: float
    cost_per_team: float
    cost_per_vehicle: float
    fixed_ops_cost: float
    min_coverage_pct: float


# These values preserve the fixed emergency-response model used before profiles.
EMERGENCY_RESPONSE_PROFILE = IncidentProfile(
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

# No prior fleet-specific constants exist in this checkout, so this compatibility
# profile deliberately retains the established default operating model.
DELIVERY_FLEET_CAPACITY_PLANNING_PROFILE = IncidentProfile(
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

EARTHQUAKE_RESPONSE_PROFILE = IncidentProfile(
    total_demand=800, team_capacity=12, vehicle_capacity=10,
    min_response_time=25, base_response_time=150,
    cost_per_team=60000, cost_per_vehicle=40000,
    fixed_ops_cost=100000, min_coverage_pct=75,
)

TSUNAMI_EVACUATION_PROFILE = IncidentProfile(
    total_demand=600, team_capacity=25, vehicle_capacity=30,
    min_response_time=5, base_response_time=40,
    cost_per_team=25000, cost_per_vehicle=20000,
    fixed_ops_cost=70000, min_coverage_pct=90,
)

WILDFIRE_CONTAINMENT_PROFILE = IncidentProfile(
    total_demand=1500, team_capacity=15, vehicle_capacity=20,
    min_response_time=30, base_response_time=240,
    cost_per_team=45000, cost_per_vehicle=55000,
    fixed_ops_cost=120000, min_coverage_pct=65,
)

INDUSTRIAL_ACCIDENT_PROFILE = IncidentProfile(
    total_demand=300, team_capacity=10, vehicle_capacity=8,
    min_response_time=15, base_response_time=70,
    cost_per_team=70000, cost_per_vehicle=45000,
    fixed_ops_cost=90000, min_coverage_pct=80,
)

INCIDENT_PROFILES = {
    "emergency_response": EMERGENCY_RESPONSE_PROFILE,
    "delivery_fleet_capacity_planning": DELIVERY_FLEET_CAPACITY_PLANNING_PROFILE,
    "earthquake_response": EARTHQUAKE_RESPONSE_PROFILE,
    "tsunami_evacuation": TSUNAMI_EVACUATION_PROFILE,
    "wildfire_containment": WILDFIRE_CONTAINMENT_PROFILE,
    "industrial_accident": INDUSTRIAL_ACCIDENT_PROFILE,
}

DEFAULT_PROFILE = EMERGENCY_RESPONSE_PROFILE


def get_incident_profile(incident_type: str | None) -> IncidentProfile:
    """Resolve a domain key, defaulting omitted legacy requests to emergency response."""
    return INCIDENT_PROFILES[incident_type or "emergency_response"]


# Backward-compatible exports for code that still consumes the default domain.
TOTAL_DEMAND = DEFAULT_PROFILE.total_demand
TEAM_CAPACITY = DEFAULT_PROFILE.team_capacity
VEHICLE_CAPACITY = DEFAULT_PROFILE.vehicle_capacity
MIN_RESPONSE_TIME = DEFAULT_PROFILE.min_response_time
BASE_RESPONSE_TIME = DEFAULT_PROFILE.base_response_time
COST_PER_TEAM = DEFAULT_PROFILE.cost_per_team
COST_PER_VEHICLE = DEFAULT_PROFILE.cost_per_vehicle
FIXED_OPS_COST = DEFAULT_PROFILE.fixed_ops_cost
MIN_COVERAGE_PCT = DEFAULT_PROFILE.min_coverage_pct
