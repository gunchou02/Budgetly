from functools import lru_cache

from app.core.config import get_settings
from app.providers.base import ReceiptAnalyzer, SpendingReportAnalyzer
from app.providers.fake import FakeReceiptAnalyzer, FakeSpendingReportAnalyzer


@lru_cache
def get_receipt_analyzer() -> ReceiptAnalyzer:
    provider = get_settings().receipt_provider
    if provider == "fake":
        return FakeReceiptAnalyzer()

    raise ValueError(f"Unsupported receipt provider: {provider}")


@lru_cache
def get_report_analyzer() -> SpendingReportAnalyzer:
    provider = get_settings().report_provider
    if provider == "fake":
        return FakeSpendingReportAnalyzer()

    raise ValueError(f"Unsupported report provider: {provider}")
