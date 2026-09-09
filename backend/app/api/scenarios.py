# Mutating endpoint: send X-API-Key matching DECISIONOS_API_KEY.
from fastapi import APIRouter, Depends

from . import engine_adapter as engine
from .schemas import GenerateRequest, to_jsonable
from .security import require_api_key
from .services import build_scenario, persistence_record, run_pipeline
from .supabase_repo import SupabaseRepository

router = APIRouter()


@router.post("/api/scenarios/generate")
def generate_scenarios(
    payload: GenerateRequest,
    _: None = Depends(require_api_key),
) -> dict:
    base_scenario = build_scenario(payload.base_scenario)
    outcomes = []
    repository = SupabaseRepository()

    for scenario in engine.generate_variants(
        base_scenario,
        payload.count,
        payload.strategy,
    ):
        outcome = run_pipeline(scenario)
        persisted = repository.save_scenario(
            persistence_record(scenario, outcome)
        )

        data = to_jsonable(outcome)
        data["persisted"] = persisted
        outcomes.append(data)

    return {"outcomes": outcomes}


@router.get("/api/scenarios")
def list_scenarios() -> list[dict]:
    return SupabaseRepository().list_scenarios()
