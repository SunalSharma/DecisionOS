from fastapi import APIRouter

from . import engine_adapter as engine
from .schemas import GenerateRequest, to_jsonable
from .services import build_scenario, persistence_record, run_pipeline, set_persisted
from .supabase_repo import SupabaseRepository

router = APIRouter()


@router.post("/api/scenarios/generate")
def generate_scenarios(payload: GenerateRequest) -> dict:
    base_scenario = build_scenario(payload.base_scenario)
    outcomes = []
    repository = SupabaseRepository()
    for scenario in engine.generate_variants(base_scenario, payload.count, payload.strategy):
        outcome = run_pipeline(scenario)
        persisted = repository.save_scenario(persistence_record(scenario, outcome))
        outcomes.append(to_jsonable(set_persisted(outcome, persisted)))
    return {"outcomes": outcomes}


@router.get("/api/scenarios")
def list_scenarios() -> list[dict]:
    return SupabaseRepository().list_scenarios()
