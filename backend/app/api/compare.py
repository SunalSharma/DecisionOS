from fastapi import APIRouter, HTTPException

from . import engine_adapter as engine
from .schemas import CompareRequest, ScenarioInput, to_jsonable
from .services import build_scenario, run_pipeline, serialize_outcome
from .supabase_repo import SupabaseRepository

router = APIRouter()


def resolve_outcomes(payload: CompareRequest):
    if payload.scenarios:
        return [
            run_pipeline(build_scenario(scenario), incident_type=scenario.incident_type)
            for scenario in payload.scenarios
        ]

    repository = SupabaseRepository()
    scenarios = []
    for scenario_id in payload.scenario_ids or []:
        record = repository.get_scenario(scenario_id)
        if record is None:
            raise HTTPException(status_code=404, detail=f"Scenario not found: {scenario_id}")
        scenario_input = ScenarioInput.model_validate(record["scenario"])
        scenarios.append(
            (build_scenario(scenario_input, scenario_id=scenario_id), scenario_input.incident_type)
        )
    return [run_pipeline(scenario, incident_type=incident_type) for scenario, incident_type in scenarios]


@router.post("/api/compare")
def compare_scenarios(payload: CompareRequest) -> dict:
    outcomes = resolve_outcomes(payload)
    return to_jsonable(
        {
            "outcomes": [serialize_outcome(outcome) for outcome in outcomes],
            "ranking": engine.rank(outcomes),
            "recommendation": engine.recommend(outcomes),
            "trade_offs": engine.build_trade_offs(outcomes),
        }
    )
