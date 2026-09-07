from fastapi import APIRouter

from . import engine_adapter as engine
from .compare import resolve_outcomes
from .schemas import CompareRequest, to_jsonable

router = APIRouter()


@router.post("/api/recommend")
def recommend_scenario(payload: CompareRequest) -> dict:
    return to_jsonable(engine.recommend(resolve_outcomes(payload)))
