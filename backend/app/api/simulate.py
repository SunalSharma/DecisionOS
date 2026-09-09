from fastapi import APIRouter

from .schemas import ScenarioInput, to_jsonable
from .services import build_scenario, persistence_record, resolve_incident_type, run_pipeline
from .supabase_repo import SupabaseRepository

router = APIRouter()


@router.post("/api/simulate")
def simulate_scenario(payload: ScenarioInput) -> dict:
    scenario = build_scenario(payload)
    outcome = run_pipeline(scenario, incident_type=payload.incident_type)
    persisted = SupabaseRepository().save_scenario(
        persistence_record(scenario, outcome, incident_type=payload.incident_type)
    )
    data = to_jsonable(outcome)
    return {
        "scenario_id": data["scenario"]["id"],
        "result": data["result"],
        "constraint_check": data["constraint_check"],
        "score_breakdown": data["score_breakdown"],
        "explanation": data["explanation"],
        "persisted": persisted,
        "incident_type": resolve_incident_type(payload.incident_type),
    }


