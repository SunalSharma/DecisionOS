"""Imports for the DecisionOS engine boundary.

The engine is a required in-repository dependency. Keeping local fallback models
would duplicate its contract and allow the API layer to drift from it.
"""

from backend.engine import (
    build_trade_offs,
    check_constraints,
    explain,
    generate_variants,
    rank,
    recommend,
    score,
    simulate,
)
from backend.engine.domain_data import MIN_COVERAGE_PCT
from backend.engine.models import Constraints, Priorities, Resources, Scenario, ScenarioOutcome

__all__ = [
    "MIN_COVERAGE_PCT",
    "Constraints",
    "Priorities",
    "Resources",
    "Scenario",
    "ScenarioOutcome",
    "build_trade_offs",
    "check_constraints",
    "explain",
    "generate_variants",
    "rank",
    "recommend",
    "score",
    "simulate",
]
