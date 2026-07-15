import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader

from app.core.config import Settings, get_settings

internal_token_header = APIKeyHeader(name="X-Internal-Token", auto_error=False)


async def verify_internal_token(
    supplied_token: Annotated[str | None, Security(internal_token_header)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> None:
    expected_token = settings.internal_api_token.get_secret_value()

    if not secrets.compare_digest(supplied_token or "", expected_token):
        raise HTTPException(
            status_code=401,
            detail={
                "code": "unauthorized",
                "message": "A valid internal service token is required.",
            },
        )
