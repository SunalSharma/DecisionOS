"""Hard feasibility checks for emergency-response scenarios."""

from .domain_data import DEFAULT_PROFILE, IncidentProfile
from .models import ConstraintCheck, ConstraintViolation, Scenario, SimulationResult


def check_constraints(
    scenario: Scenario,
    result: SimulationResult,
    profile: IncidentProfile = DEFAULT_PROFILE,
) -> ConstraintCheck:
    """Return every violated hard constraint; feasible scenarios return PASS."""
    del profile  # All domain operations accept a common profile; limits remain scenario inputs.
    violations: list[ConstraintViolation] = []

    if result.cost > scenario.resources.budget:
        violations.append(
            ConstraintViolation(
                name="budget",
                limit=scenario.resources.budget,
                actual=result.cost,
                message="Scenario cost exceeds the available budget.",
            )
        )
    if result.response_time_min > scenario.constraints.deadline_min:
        violations.append(
            ConstraintViolation(
                name="deadline_min",
                limit=scenario.constraints.deadline_min,
                actual=result.response_time_min,
                message="Response time exceeds the required deadline.",
            )
        )
    if result.coverage_pct < scenario.constraints.min_coverage_pct:
        violations.append(
            ConstraintViolation(
                name="min_coverage_pct",
                limit=scenario.constraints.min_coverage_pct,
                actual=result.coverage_pct,
                message="Demand coverage is below the required minimum.",
            )
        )

    return ConstraintCheck(
        status="FAIL" if violations else "PASS",
        violations=violations,
    )
