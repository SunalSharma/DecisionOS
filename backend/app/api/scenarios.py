from fastapi import APIRouter

from . import engine_adapter as engine
from .schemas import GenerateRequest
from .services import (
    build_scenario,
    persistence_record,
    run_pipeline,
    serialize_outcome,
    set_persisted,
)
from .supabase_repo import SupabaseRepository

router = APIRouter()


@router.post("/api/scenarios/generate")
def generate_scenarios(payload: GenerateRequest) -> dict:
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

        # The flag now lives on the outcome itself rather than being spliced
        # into the response dict, so anything downstream of the pipeline can see
        # whether the run was saved.
        outcome = set_persisted(outcome, persisted)
        outcomes.append(serialize_outcome(outcome))

    return {"outcomes": outcomes}


@router.get("/api/scenarios")
def list_scenarios() -> list[dict]:
    return SupabaseRepository().list_scenarios()
