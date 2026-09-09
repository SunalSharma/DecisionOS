from fastapi import APIRouter

from . import engine_adapter as engine
from .schemas import GenerateRequest
from .services import (
    build_scenario,
    persistence_record,
    resolve_incident_type,
    resolve_profile,
    run_pipeline,
    serialize_outcome,
    set_persisted,
)
from .supabase_repo import SupabaseRepository

router = APIRouter()


@router.post("/api/scenarios/generate")
def generate_scenarios(payload: GenerateRequest) -> dict:
    incident_type = payload.base_scenario.incident_type
    base_scenario = build_scenario(payload.base_scenario)
    outcomes = []
    repository = SupabaseRepository()

    for scenario in engine.generate_variants(
        base_scenario,
        payload.count,
        payload.strategy,
        resolve_profile(incident_type),
    ):
        outcome = run_pipeline(scenario, incident_type=incident_type)
        persisted = repository.save_scenario(
            persistence_record(scenario, outcome, incident_type=incident_type)
        )

        # The flag now lives on the outcome itself rather than being spliced
        # into the response dict, so anything downstream of the pipeline can see
        # whether the run was saved.
        outcome = set_persisted(outcome, persisted)
        outcomes.append(serialize_outcome(outcome))

    return {"outcomes": outcomes, "incident_type": resolve_incident_type(incident_type)}


@router.get("/api/scenarios")
def list_scenarios() -> list[dict]:
    return SupabaseRepository().list_scenarios()


@router.get("/api/incident-types")
def list_incident_types() -> dict:
    return {
        "default": resolve_incident_type(None),
        "incident_types": [
            {
                "id": key,
                "name": profile.name,
                "total_demand": profile.total_demand,
                "min_coverage_pct": profile.min_coverage_pct,
            }
            for key, profile in engine.INCIDENT_PROFILES.items()
        ],
    }
