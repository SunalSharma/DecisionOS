"""Ranking, recommendation, and trade-off helpers."""

from .models import (
    RankedOutcome,
    Recommendation,
    ScenarioOutcome,
    TradeOffPoint,
)


def rank(outcomes: list[ScenarioOutcome]) -> list[RankedOutcome]:
    """Rank passing outcomes before failed outcomes, then by descending score."""
    ordered = sorted(
        outcomes,
        key=lambda outcome: (
            outcome.constraint_check.status != "PASS",
            -outcome.score_breakdown.score,
            outcome.scenario.id,
        ),
    )
    return [
        RankedOutcome(
            scenario_id=outcome.scenario.id,
            rank=index,
            score=outcome.score_breakdown.score,
            constraint_status=outcome.constraint_check.status,
        )
        for index, outcome in enumerate(ordered, start=1)
    ]


def recommend(outcomes: list[ScenarioOutcome]) -> Recommendation:
    """Recommend the highest-scoring feasible scenario, if one exists."""
    feasible_outcomes = [
        outcome for outcome in outcomes if outcome.constraint_check.status == "PASS"
    ]
    if not feasible_outcomes:
        return Recommendation(
            feasible=False,
            recommended_scenario_id=None,
            reasoning=[
                "No scenario satisfies all hard budget, deadline, and coverage constraints.",
                "Adjust resources or constraints before selecting a recommendation.",
            ],
        )

    selected = sorted(
        feasible_outcomes,
        key=lambda outcome: (-outcome.score_breakdown.score, outcome.scenario.id),
    )[0]
    return Recommendation(
        feasible=True,
        recommended_scenario_id=selected.scenario.id,
        reasoning=[
            "This scenario passes every hard constraint.",
            f"It has the highest feasible weighted score ({selected.score_breakdown.score:.1f}/100).",
        ],
    )


def build_trade_offs(outcomes: list[ScenarioOutcome]) -> list[TradeOffPoint]:
    """Build plot-ready points without filtering out infeasible scenarios."""
    return [
        TradeOffPoint(
            scenario_id=outcome.scenario.id,
            response_time_min=outcome.result.response_time_min,
            cost=outcome.result.cost,
            coverage_pct=outcome.result.coverage_pct,
            score=outcome.score_breakdown.score,
        )
        for outcome in outcomes
    ]
