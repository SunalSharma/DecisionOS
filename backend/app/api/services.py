from __future__ import annotations

from dataclasses import replace
from uuid import uuid4

from . import engine_adapter as engine
from .schemas import ScenarioInput, to_jsonable

DEFAULT_INCIDENT_TYPE = next(
    key for key, profile in engine.INCIDENT_PROFILES.items() if profile is engine.DEFAULT_PROFILE
)


def resolve_incident_type(incident_type: str | None) -> str:
    if incident_type is not None and incident_type in engine.INCIDENT_PROFILES:
        return incident_type
    return DEFAULT_INCIDENT_TYPE


def resolve_profile(incident_type: str | None):
    return engine.INCIDENT_PROFILES[resolve_incident_type(incident_type)]


def build_scenario(payload: ScenarioInput, scenario_id: str | None = None):
    return engine.Scenario(
        id=scenario_id or str(uuid4()),
        name=payload.name,
        resources=engine.Resources(**payload.resources.model_dump()),
        constraints=engine.Constraints(
            deadline_min=payload.constraints.deadline_min,
            min_coverage_pct=resolve_profile(payload.incident_type).min_coverage_pct,
        ),
        priorities=engine.Priorities(**payload.priorities.model_dump()),
    )


def scenario_id(scenario) -> str:
    return str(getattr(scenario, "scenario_id", getattr(scenario, "id", "")))


def run_pipeline(scenario, persisted: bool | None = None, incident_type: str | None = None):
    profile = resolve_profile(incident_type)
    result = engine.simulate(scenario, profile)
    constraint_check = engine.check_constraints(scenario, result, profile)
    score_breakdown = engine.score(scenario, result, profile)
    explanation = engine.explain(scenario, result, constraint_check, score_breakdown)
    outcome = engine.ScenarioOutcome(
        scenario=scenario,
        result=result,
        constraint_check=constraint_check,
        score_breakdown=score_breakdown,
        explanation=explanation,
    )
    # Callers that already know the persistence result can stamp it here;
    # /api/scenarios/generate cannot, because it only learns the answer after
    # the repository call, so it applies set_persisted() afterwards instead.
    if persisted is not None:
        outcome = set_persisted(outcome, persisted)
    return outcome


def persistence_record(scenario, outcome, incident_type: str | None = None) -> dict:
    outcome_data = to_jsonable(outcome)
    score = outcome_data.get("score_breakdown") or {}
    constraint_check = outcome_data.get("constraint_check") or {}
    stored = to_jsonable(scenario)
    stored["incident_type"] = resolve_incident_type(incident_type)
    return {
        "scenario_id": scenario_id(scenario),
        "name": getattr(scenario, "name", None),
        "scenario": stored,
        "result": outcome_data.get("result"),
        "constraint_check": outcome_data.get("constraint_check"),
        "score_breakdown": outcome_data.get("score_breakdown"),
        "explanation": outcome_data.get("explanation"),
        "score": score.get("total", score.get("score")),
        "constraint_status": constraint_check.get("passed", constraint_check.get("status")),
    }


def set_persisted(outcome, persisted: bool):
    """Return the outcome with the repository's answer recorded on it.

    Every outcome reaching this comes from run_pipeline(), which builds the
    engine's ScenarioOutcome dataclass, so replace() is the only case there
    is. The model_copy() and attribute-assignment branches this used to carry
    existed for the engine_adapter fallback and became unreachable when that
    fallback was deleted.
    """
    return replace(outcome, persisted=persisted)


def serialize_outcome(outcome, persisted: bool | None = None) -> dict:
    """Expose the engine outcome with a stable top-level scenario identifier."""
    data = to_jsonable(outcome)
    data["scenario_id"] = scenario_id(outcome.scenario)
    # An explicit argument wins; otherwise take whatever set_persisted() stamped
    # on the outcome. Endpoints that never touch the repository (compare,
    # recommend) leave it unset, and those responses stay free of the key rather
    # than carrying a null that a client would have to interpret.
    resolved = persisted if persisted is not None else outcome.persisted
    if resolved is None:
        data.pop("persisted", None)
    else:
        data["persisted"] = resolved
    return data

