"""Optional shared API-key protection for the DecisionOS HTTP API."""

import os
import secrets

from fastapi import Header, HTTPException, status


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Require X-API-Key only when API_KEY is configured on the server."""
    expected_key = os.getenv("API_KEY")
    if not expected_key:
        return
    if not x_api_key or not secrets.compare_digest(x_api_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid API key.",
        )
