from fastapi import APIRouter, HTTPException

from . import engine_adapter as engine
from .schemas import CompareRequest, ScenarioInput, to_jsonable
from .services import build_scenario, outcome_response, run_pipeline
from .supabase_repo import SupabaseRepository

router = APIRouter()


def resolve_outcomes(payload: CompareRequest):
    if payload.scenarios:
        return [run_pipeline(build_scenario(scenario)) for scenario in payload.scenarios]

    repository = SupabaseRepository()
    scenarios = []
    for scenario_id in payload.scenario_ids or []:
        record = repository.get_scenario(scenario_id)
        if record is None:
            raise HTTPException(status_code=404, detail=f"Scenario not found: {scenario_id}")
        scenarios.append(build_scenario(ScenarioInput.model_validate(record["scenario"]), scenario_id=scenario_id))
    return [run_pipeline(scenario) for scenario in scenarios]


@router.post("/api/compare")
def compare_scenarios(payload: CompareRequest) -> dict:
    outcomes = resolve_outcomes(payload)
    return to_jsonable(
        {
            "outcomes": [outcome_response(outcome) for outcome in outcomes],
            "ranking": engine.rank(outcomes),
            "recommendation": engine.recommend(outcomes),
            "trade_offs": engine.build_trade_offs(outcomes),
        }
    )
