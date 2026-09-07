import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.compare import router as compare_router
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulate_router)
app.include_router(compare_router)
app.include_router(recommend_router)
app.include_router(scenarios_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
