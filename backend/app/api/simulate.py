# Mutating endpoint: send X-API-Key matching DECISIONOS_API_KEY.
from fastapi import APIRouter, Depends

from .schemas import ScenarioInput, to_jsonable
from .security import require_api_key
from .services import build_scenario, persistence_record, run_pipeline
from .supabase_repo import SupabaseRepository

router = APIRouter()


@router.post("/api/simulate")
def simulate_scenario(
    payload: ScenarioInput,
    _: None = Depends(require_api_key),
) -> dict:
    scenario = build_scenario(payload)
    outcome = run_pipeline(scenario)
    persisted = SupabaseRepository().save_scenario(persistence_record(scenario, outcome))
    data = to_jsonable(outcome)
    return {
        "scenario_id": data["scenario"]["id"],
        "result": data["result"],
        "constraint_check": data["constraint_check"],
        "score_breakdown": data["score_breakdown"],
        "explanation": data["explanation"],
        "persisted": persisted,
    }


