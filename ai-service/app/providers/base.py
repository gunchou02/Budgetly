from typing import Protocol

from app.schemas.receipt import ReceiptAnalysisRequest, ReceiptAnalysisResponse
from app.schemas.report import SpendingReportRequest, SpendingReportResponse
from app.services.images import ProcessedReceiptImage


class ReceiptAnalyzer(Protocol):
    async def analyze(
        self,
        request: ReceiptAnalysisRequest,
        image: ProcessedReceiptImage,
    ) -> ReceiptAnalysisResponse: ...


class SpendingReportAnalyzer(Protocol):
    async def analyze(self, request: SpendingReportRequest) -> SpendingReportResponse: ...
