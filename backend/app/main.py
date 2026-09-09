import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.compare import router as compare_router
from backend.app.api.auth import require_api_key
from backend.app.api.recommend import router as recommend_router
from backend.app.api.scenarios import router as scenarios_router
from backend.app.api.simulate import router as simulate_router

app = FastAPI(title="DecisionOS API")

configured_origins = os.getenv("ALLOWED_ORIGINS")
allowed_origins = (
    [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
    if configured_origins
    else ["http://localhost:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)

api_key_dependency = [Depends(require_api_key)]
app.include_router(simulate_router, dependencies=api_key_dependency)
app.include_router(compare_router, dependencies=api_key_dependency)
app.include_router(recommend_router, dependencies=api_key_dependency)
app.include_router(scenarios_router, dependencies=api_key_dependency)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
