"""Small boundary around Nilaksh's pure-Python engine.

The fallback is intentionally development-only: it permits API work before the
engine branch lands and is replaced automatically once its frozen module exists.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

try:  # pragma: no cover - exercised after the engine branch is merged
    from backend.engine.domain_data import MIN_COVERAGE_PCT
    from backend.engine.models import Constraints, Priorities, Resources, Scenario, ScenarioOutcome
    from backend.engine import (
        build_trade_offs,
        check_constraints,
        explain,
        generate_variants,
        get_incident_profile,
        rank,
        recommend,
        score,
        simulate,
    )
except (ImportError, ModuleNotFoundError):
    MIN_COVERAGE_PCT = 60.0  # mirrors backend.engine.domain_data's default while that module is unavailable

    @dataclass
    class Resources:
        teams: int
        vehicles: int
        budget: float

    @dataclass
    class Constraints:
        deadline_min: float
        min_coverage_pct: float = 0.0

    @dataclass
    class Priorities:
        speed: float
        cost: float
        coverage: float

    @dataclass
    class Scenario:
        scenario_id: str
        name: str | None
        resources: Resources
        constraints: Constraints
        priorities: Priorities

    @dataclass
    class ScenarioOutcome:
        scenario_id: str
        result: dict
        constraint_check: dict
        score_breakdown: dict
        explanation: list[str]
        persisted: bool = False

    def simulate(scenario: Scenario) -> dict:
        return {"estimated_duration_min": 0.0, "estimated_cost": 0.0, "coverage_pct": 0.0}

    def check_constraints(scenario: Scenario, result: dict) -> dict:
        return {"passed": True, "violations": []}

    def score(scenario: Scenario, result: dict) -> dict:
        return {"total": 0.0}

    def explain(scenario: Scenario, result: dict, constraint_check: dict, score_breakdown: dict) -> list[str]:
        return ["Fixture engine output; replace with the DecisionOS engine implementation."]

    def generate_variants(base_scenario: Scenario, count: int, strategy: str | None = None) -> list[Scenario]:
        return [
            Scenario(str(uuid4()), base_scenario.name, base_scenario.resources, base_scenario.constraints, base_scenario.priorities)
            for _ in range(count)
        ]

    def rank(outcomes: list[ScenarioOutcome]) -> list[dict]:
        return [{"scenario_id": outcome.scenario_id, "rank": index + 1} for index, outcome in enumerate(outcomes)]

    def recommend(outcomes: list[ScenarioOutcome]) -> dict:
        return {"scenario_id": outcomes[0].scenario_id} if outcomes else {}

    def build_trade_offs(outcomes: list[ScenarioOutcome]) -> list[dict]:
        return []

    @dataclass(frozen=True)
    class _FallbackProfile:
        min_coverage_pct: float = MIN_COVERAGE_PCT

    def get_incident_profile(incident_type: str | None) -> _FallbackProfile:
        return _FallbackProfile()
