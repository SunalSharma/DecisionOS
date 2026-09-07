"""Priority-weighted scoring for simulated scenarios."""

from .domain_data import BASE_RESPONSE_TIME, MIN_RESPONSE_TIME
from .models import Scenario, ScoreBreakdown, SimulationResult


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


def score(scenario: Scenario, result: SimulationResult) -> ScoreBreakdown:
    """Score favorable speed, cost, and coverage components on a 0--100 scale."""
    speed_component = _clamp_unit(
        (BASE_RESPONSE_TIME - result.response_time_min)
        / (BASE_RESPONSE_TIME - MIN_RESPONSE_TIME)
    )
    budget = scenario.resources.budget
    cost_component = (
        _clamp_unit((budget - result.cost) / budget)
        if budget > 0
        else (1.0 if result.cost <= 0 else 0.0)
    )
    coverage_component = _clamp_unit(result.coverage_pct / 100.0)

    raw_weights = {
        "speed": max(0.0, scenario.priorities.speed),
        "cost": max(0.0, scenario.priorities.cost),
        "coverage": max(0.0, scenario.priorities.coverage),
    }
    weight_total = sum(raw_weights.values())
    if weight_total == 0:
        weights = {name: 1 / 3 for name in raw_weights}
    else:
        weights = {name: value / weight_total for name, value in raw_weights.items()}

    components = {
        "speed": speed_component,
        "cost": cost_component,
        "coverage": coverage_component,
        "weights": weights,
    }
    total_score = 100 * (
        speed_component * weights["speed"]
        + cost_component * weights["cost"]
        + coverage_component * weights["coverage"]
    )
    return ScoreBreakdown(score=total_score, components=components)
