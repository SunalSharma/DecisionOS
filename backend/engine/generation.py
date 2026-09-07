"""Deterministic scenario-variant generation strategies."""

from typing import Literal

from .domain_data import MIN_COVERAGE_PCT
from .models import Constraints, Priorities, Resources, Scenario


Strategy = Literal[
    "speed_optimized",
    "cost_optimized",
    "balanced",
    "perturbed",
    "infeasible",
]


def generate_variants(
    base_scenario: Scenario,
    count: int,
    strategy: Strategy | None = None,
) -> list[Scenario]:
    """Create deterministic variants; named *_optimized strategies intentionally use pure objective priorities."""
    if count < 0:
        raise ValueError("count must be non-negative")

    selected_strategy: Strategy = strategy or "balanced"
    variants: list[Scenario] = []
    perturbations = ((1, 0), (0, 1), (-1, 1), (1, -1), (2, 0), (0, 2))

    for index in range(1, count + 1):
        teams = base_scenario.resources.teams
        vehicles = base_scenario.resources.vehicles
        priorities = base_scenario.priorities
        variant_constraints = base_scenario.constraints

        if selected_strategy == "speed_optimized":
            teams += index
            vehicles += index
            variant_priorities = Priorities(speed=1.0, cost=0.0, coverage=0.0)
        elif selected_strategy == "cost_optimized":
            teams = max(0, teams - index)
            vehicles = max(0, vehicles - index)
            variant_priorities = Priorities(speed=0.0, cost=1.0, coverage=0.0)
        elif selected_strategy == "balanced":
            teams += index % 2
            vehicles += (index + 1) % 2
            variant_priorities = Priorities(
                speed=priorities.speed,
                cost=priorities.cost,
                coverage=priorities.coverage,
            )
        elif selected_strategy == "perturbed":
            team_delta, vehicle_delta = perturbations[(index - 1) % len(perturbations)]
            teams = max(0, teams + team_delta)
            vehicles = max(0, vehicles + vehicle_delta)
            variant_priorities = Priorities(
                speed=priorities.speed,
                cost=priorities.cost,
                coverage=priorities.coverage,
            )
        elif selected_strategy == "infeasible":
            # Zero capacity plus the validated coverage floor guarantees a hard failure.
            teams = 0
            vehicles = 0
            variant_constraints = Constraints(
                deadline_min=base_scenario.constraints.deadline_min,
                min_coverage_pct=max(
                    base_scenario.constraints.min_coverage_pct,
                    MIN_COVERAGE_PCT,
                ),
            )
            variant_priorities = Priorities(
                speed=priorities.speed,
                cost=priorities.cost,
                coverage=priorities.coverage,
            )
        else:
            raise ValueError(f"Unknown generation strategy: {selected_strategy}")

        variants.append(
            Scenario(
                id=f"{base_scenario.id}-variant-{index}",
                name=f"{base_scenario.name or base_scenario.id} variant {index}",
                resources=Resources(
                    teams=teams,
                    vehicles=vehicles,
                    budget=base_scenario.resources.budget,
                ),
                constraints=variant_constraints,
                priorities=variant_priorities,
            )
        )
    return variants
