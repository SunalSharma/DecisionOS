from __future__ import annotations

import logging
import os
from typing import Any

from supabase import ClientOptions, create_client

logger = logging.getLogger(__name__)


class SupabaseRepository:
    """Best-effort persistence. Database errors never escape the API layer."""

    def __init__(self, url: str | None = None, key: str | None = None) -> None:
        self._url = url or os.getenv("SUPABASE_URL")
        self._key = key or os.getenv("SUPABASE_KEY")

    def _client(self):
        if not self._url or not self._key:
            raise RuntimeError("Supabase is not configured")
        options = ClientOptions(postgrest_client_timeout=3)
        return create_client(self._url, self._key, options=options)

    def save_scenario(self, record: dict[str, Any]) -> bool:
        scenario_id = record["scenario_id"]
        try:
            self._client().table("scenarios").upsert(record).execute()
            return True
        except Exception as exc:
            logger.exception("Supabase save failed for scenario %s: %s", scenario_id, exc)
            return False

    def list_scenarios(self) -> list[dict[str, Any]]:
        try:
            response = self._client().table("scenarios").select(
                "scenario_id,name,created_at,score,constraint_status"
            ).order("created_at", desc=True).execute()
            return list(response.data or [])
        except Exception as exc:
            logger.exception("Supabase list failed for scenario list: %s", exc)
            return []

    def get_scenario(self, scenario_id: str) -> dict[str, Any] | None:
        try:
            response = self._client().table("scenarios").select("*").eq("scenario_id", scenario_id).limit(1).execute()
            return response.data[0] if response.data else None
        except Exception as exc:
            logger.exception("Supabase lookup failed for scenario %s: %s", scenario_id, exc)
            return None
