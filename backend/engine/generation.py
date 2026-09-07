"""Deterministic scenario-variant generation strategies."""

from typing import Literal

from .domain_data import MIN_COVERAGE_PCT
from .models import Constraints, Priorities, Resources, Scenario


Strategy = Literal[
    "speed_optimized",
    "cost_optimized",
    "balanced",
    "perturbed",
    "speed",
    "cost",
    "coverage",
    "infeasible",
]


def _scaled_step(resource_count: int) -> int:
    """Return a deterministic, base-relative step that is never zero."""
    return max(1, (resource_count + 4) // 5)


def _cost_optimized_pairs(teams: int, vehicles: int, count: int) -> list[tuple[int, int]]:
    """Return distinct non-negative resource pairs, ordered by smallest reduction."""
    candidates = [
        (team_count, vehicle_count)
        for team_count in range(teams, -1, -1)
        for vehicle_count in range(vehicles, -1, -1)
        if (team_count, vehicle_count) != (teams, vehicles)
    ]
    candidates.sort(
        key=lambda pair: (
            (teams - pair[0]) + (vehicles - pair[1]),
            -pair[0],
            -pair[1],
        )
    )
    return candidates[:count]


def generate_variants(
    base_scenario: Scenario,
    count: int,
    strategy: Strategy | None = None,
) -> list[Scenario]:
    """Create deterministic, distinct resource variants without mutating the base."""

    if count < 0:
        raise ValueError("count must be non-negative")

    selected_strategy: Strategy = strategy or "balanced"
    base_teams = base_scenario.resources.teams
    base_vehicles = base_scenario.resources.vehicles
    priorities = base_scenario.priorities
    team_step = _scaled_step(base_teams)
    vehicle_step = _scaled_step(base_vehicles)
    cost_pairs = (
        _cost_optimized_pairs(base_teams, base_vehicles, count)
        if selected_strategy in ("cost", "cost_optimized")
        else None
    )
    variant_count = len(cost_pairs) if cost_pairs is not None else count
    variants: list[Scenario] = []

    for index in range(variant_count):
        teams = base_teams
        vehicles = base_vehicles
        variant_constraints = base_scenario.constraints

        if selected_strategy in ("speed", "speed_optimized"):
            teams += team_step * (index + 1)
            vehicles += vehicle_step * (index + 1)

            variant_priorities = Priorities(
                speed=1.0,
                cost=0.0,
                coverage=0.0,
            )

        elif selected_strategy in ("cost", "cost_optimized"):
            teams, vehicles = cost_pairs[index]

            variant_priorities = Priorities(
                speed=0.0,
                cost=1.0,
                coverage=0.0,
            )

        elif selected_strategy == "coverage":
            teams = base_teams + team_step * (index + 1)
            vehicles = base_vehicles + vehicle_step * (index + 2)

            variant_priorities = Priorities(
                speed=0.0,
                cost=0.0,
                coverage=1.0,
            )

        elif selected_strategy == "balanced":
            teams += team_step * (index + 1)
            vehicles += vehicle_step * ((index + 2) // 2)

            variant_priorities = Priorities(
                speed=priorities.speed,
                cost=priorities.cost,
                coverage=priorities.coverage,
            )

        elif selected_strategy == "perturbed":
            teams += team_step * (index + 1)
            vehicles = max(0, vehicles - vehicle_step * (index + 1))

            variant_priorities = Priorities(
                speed=priorities.speed,
                cost=priorities.cost,
                coverage=priorities.coverage,
            )

        elif selected_strategy == "infeasible":
            # At most nine teams cover 45%, below the validated 60% floor.
            teams = index
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
            raise ValueError(
                f"Unknown generation strategy: {selected_strategy}"
            )

        variants.append(
            Scenario(
                id=f"{base_scenario.id}-variant-{index + 1}",
                name=(
                    f"{base_scenario.name or base_scenario.id} "
                    f"variant {index + 1}"
                ),
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
