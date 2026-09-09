"""Small shared-key guard for state-changing API operations."""

import os
import secrets

from fastapi import Header, HTTPException, status


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Require X-API-Key to match the server-side DECISIONOS_API_KEY value."""
    expected_key = os.getenv("DECISIONOS_API_KEY")
    if not expected_key or not x_api_key or not secrets.compare_digest(x_api_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
