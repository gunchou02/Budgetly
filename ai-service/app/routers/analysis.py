from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.core.security import verify_internal_token
from app.providers.base import ReceiptAnalyzer, SpendingReportAnalyzer
from app.providers.factory import get_receipt_analyzer, get_report_analyzer
from app.schemas.receipt import ReceiptAnalysisRequest, ReceiptAnalysisResponse
from app.schemas.report import SpendingReportRequest, SpendingReportResponse
from app.services.images import (
    ReceiptImagePreprocessor,
    get_receipt_image_preprocessor,
)

router = APIRouter(
    prefix="/v1",
    tags=["analysis"],
    dependencies=[Depends(verify_internal_token)],
)


@router.post("/receipts/analyze", response_model=ReceiptAnalysisResponse)
async def analyze_receipt(
    payload: Annotated[str, Form(min_length=2, max_length=50000)],
    image: Annotated[UploadFile, File()],
    analyzer: Annotated[ReceiptAnalyzer, Depends(get_receipt_analyzer)],
    preprocessor: Annotated[
        ReceiptImagePreprocessor,
        Depends(get_receipt_image_preprocessor),
    ],
) -> ReceiptAnalysisResponse:
    try:
        try:
            request = ReceiptAnalysisRequest.model_validate_json(payload)
        except ValidationError as exception:
            raise RequestValidationError(exception.errors()) from exception

        processed_image = await preprocessor.process(image, request.mime_type)
    finally:
        await image.close()

    return await analyzer.analyze(request, processed_image)


@router.post("/reports/analyze", response_model=SpendingReportResponse)
async def analyze_spending_report(
    request: SpendingReportRequest,
    analyzer: Annotated[SpendingReportAnalyzer, Depends(get_report_analyzer)],
) -> SpendingReportResponse:
    return await analyzer.analyze(request)
