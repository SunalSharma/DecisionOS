from __future__ import annotations

from uuid import uuid4

from . import engine_adapter as engine
from .schemas import ScenarioInput, to_jsonable


def build_scenario(payload: ScenarioInput, scenario_id: str | None = None):
    return engine.Scenario(
        scenario_id=scenario_id or str(uuid4()),
        name=payload.name,
        resources=engine.Resources(**payload.resources.model_dump()),
        constraints=engine.Constraints(deadline_min=payload.constraints.deadline_min, min_coverage_pct=0.0),
        priorities=engine.Priorities(**payload.priorities.model_dump()),
    )


def scenario_id(scenario) -> str:
    return str(getattr(scenario, "scenario_id", getattr(scenario, "id", "")))


def run_pipeline(scenario, persisted: bool = False):
    result = engine.simulate(scenario)
    constraint_check = engine.check_constraints(scenario, result)
    score_breakdown = engine.score(scenario, result)
    explanation = engine.explain(scenario, result, constraint_check, score_breakdown)
    outcome = engine.ScenarioOutcome(
        scenario_id=scenario_id(scenario),
        result=result,
        constraint_check=constraint_check,
        score_breakdown=score_breakdown,
        explanation=explanation,
        persisted=persisted,
    )
    return outcome


def persistence_record(scenario, outcome) -> dict:
    outcome_data = to_jsonable(outcome)
    score = outcome_data.get("score_breakdown") or {}
    constraint_check = outcome_data.get("constraint_check") or {}
    return {
        "scenario_id": scenario_id(scenario),
        "name": getattr(scenario, "name", None),
        "scenario": to_jsonable(scenario),
        "result": outcome_data.get("result"),
        "constraint_check": outcome_data.get("constraint_check"),
        "score_breakdown": outcome_data.get("score_breakdown"),
        "explanation": outcome_data.get("explanation"),
        "score": score.get("total", score.get("score")),
        "constraint_status": constraint_check.get("passed", constraint_check.get("status")),
    }


def set_persisted(outcome, persisted: bool):
    """The fixture outcome is mutable; the real engine may use Pydantic models."""
    if hasattr(outcome, "model_copy"):
        return outcome.model_copy(update={"persisted": persisted})
    if hasattr(outcome, "__dataclass_fields__"):
        from dataclasses import replace

        return replace(outcome, persisted=persisted)
    outcome.persisted = persisted
    return outcome
