from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.compare import router as compare_router
from backend.app.api.recommend import router as recommend_router
from backend.app.api.scenarios import router as scenarios_router
from backend.app.api.simulate import router as simulate_router

app = FastAPI(title="DecisionOS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
