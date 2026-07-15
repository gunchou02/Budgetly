from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.security import verify_internal_token
from app.providers.base import ReceiptAnalyzer, SpendingReportAnalyzer
from app.providers.factory import get_receipt_analyzer, get_report_analyzer
from app.schemas.receipt import ReceiptAnalysisRequest, ReceiptAnalysisResponse
from app.schemas.report import SpendingReportRequest, SpendingReportResponse

router = APIRouter(
    prefix="/v1",
    tags=["analysis"],
    dependencies=[Depends(verify_internal_token)],
)


@router.post("/receipts/analyze", response_model=ReceiptAnalysisResponse)
async def analyze_receipt(
    request: ReceiptAnalysisRequest,
    analyzer: Annotated[ReceiptAnalyzer, Depends(get_receipt_analyzer)],
) -> ReceiptAnalysisResponse:
    return await analyzer.analyze(request)


@router.post("/reports/analyze", response_model=SpendingReportResponse)
async def analyze_spending_report(
    request: SpendingReportRequest,
    analyzer: Annotated[SpendingReportAnalyzer, Depends(get_report_analyzer)],
) -> SpendingReportResponse:
    return await analyzer.analyze(request)
