from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.providers.factory import get_receipt_analyzer, get_report_analyzer

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str


class ReadinessResponse(BaseModel):
    status: Literal["ready"]
    receipt_provider: str
    report_provider: str


@router.get("/health", response_model=HealthResponse)
async def health(settings: Annotated[Settings, Depends(get_settings)]) -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
    )


@router.get("/ready", response_model=ReadinessResponse)
async def ready(settings: Annotated[Settings, Depends(get_settings)]) -> ReadinessResponse:
    try:
        get_receipt_analyzer()
        get_report_analyzer()
    except ValueError as exception:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "provider_unavailable",
                "message": "An analysis provider is not configured correctly.",
            },
        ) from exception

    return ReadinessResponse(
        status="ready",
        receipt_provider=settings.receipt_provider,
        report_provider=settings.report_provider,
    )
