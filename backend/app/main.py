import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173"]


def get_allowed_origins() -> list[str]:
    configured_origins = os.getenv("ALLOWED_ORIGINS")
    if not configured_origins:
        return DEFAULT_ALLOWED_ORIGINS
    return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]

app = FastAPI(title="DecisionOS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
