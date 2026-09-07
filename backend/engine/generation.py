"""Deterministic scenario-variant generation strategies."""

from typing import Literal

from .models import Priorities, Resources, Scenario


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


def generate_variants(
    base_scenario: Scenario,
    count: int,
    strategy: Strategy | None = None,
) -> list[Scenario]:
    """Create deterministic, distinct resource variants without mutating the base."""

    if count < 0:
        raise ValueError("count must be non-negative")

    selected_strategy: Strategy = strategy or "balanced"
    variants: list[Scenario] = []

    base_teams = base_scenario.resources.teams
    base_vehicles = base_scenario.resources.vehicles
    priorities = base_scenario.priorities

    balanced_changes = (
        (1, 0),
        (0, 1),
        (-1, 2),
        (2, -1),
        (2, 1),
        (1, 2),
    )

    for index in range(count):
        teams = base_teams
        vehicles = base_vehicles

        if selected_strategy in ("speed", "speed_optimized"):
            teams += index + 1
            vehicles += index + 1

            variant_priorities = Priorities(
                speed=1.0,
                cost=0.0,
                coverage=0.0,
            )

        elif selected_strategy in ("cost", "cost_optimized"):
            teams = max(0, base_teams - index - 1)
            vehicles = max(0, base_vehicles - index - 1)

            variant_priorities = Priorities(
                speed=0.0,
                cost=1.0,
                coverage=0.0,
            )

        elif selected_strategy == "coverage":
            teams = base_teams + index + 1
            vehicles = base_vehicles + index + 2

            variant_priorities = Priorities(
                speed=0.0,
                cost=0.0,
                coverage=1.0,
            )

        elif selected_strategy == "balanced":
            team_delta, vehicle_delta = balanced_changes[
                index % len(balanced_changes)
            ]

            teams = max(0, base_teams + team_delta)
            vehicles = max(0, base_vehicles + vehicle_delta)

            variant_priorities = Priorities(
                speed=priorities.speed,
                cost=priorities.cost,
                coverage=priorities.coverage,
            )

        elif selected_strategy == "perturbed":
            changes = (
                (1, 0),
                (0, 1),
                (-1, 1),
                (1, -1),
                (2, 0),
                (0, 2),
            )

            team_delta, vehicle_delta = changes[
                index % len(changes)
            ]

            teams = max(0, base_teams + team_delta)
            vehicles = max(0, base_vehicles + vehicle_delta)

            variant_priorities = Priorities(
                speed=priorities.speed,
                cost=priorities.cost,
                coverage=priorities.coverage,
            )

        elif selected_strategy == "infeasible":
            teams = base_teams + index + 1
            vehicles = base_vehicles + index + 1

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
                constraints=base_scenario.constraints,
                priorities=variant_priorities,
            )
        )

    return variants