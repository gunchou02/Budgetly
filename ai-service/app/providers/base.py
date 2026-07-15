from typing import Protocol

from app.schemas.receipt import ReceiptAnalysisRequest, ReceiptAnalysisResponse
from app.schemas.report import SpendingReportRequest, SpendingReportResponse


class ReceiptAnalyzer(Protocol):
    async def analyze(self, request: ReceiptAnalysisRequest) -> ReceiptAnalysisResponse: ...


class SpendingReportAnalyzer(Protocol):
    async def analyze(self, request: SpendingReportRequest) -> SpendingReportResponse: ...
