from functools import lru_cache

from app.core.config import get_settings
from app.providers.base import ReceiptAnalyzer, SpendingReportAnalyzer
from app.providers.fake import FakeReceiptAnalyzer, FakeSpendingReportAnalyzer
from app.providers.openai import (
    OpenAIReceiptAnalyzer,
    OpenAISpendingReportAnalyzer,
    create_openai_client,
)


@lru_cache
def get_receipt_analyzer() -> ReceiptAnalyzer:
    settings = get_settings()
    if settings.receipt_provider == "fake":
        return FakeReceiptAnalyzer()
    if settings.receipt_provider == "openai":
        return OpenAIReceiptAnalyzer(create_openai_client(settings), settings.openai_model)

    raise ValueError(f"Unsupported receipt provider: {settings.receipt_provider}")


@lru_cache
def get_report_analyzer() -> SpendingReportAnalyzer:
    settings = get_settings()
    if settings.report_provider == "fake":
        return FakeSpendingReportAnalyzer()
    if settings.report_provider == "openai":
        return OpenAISpendingReportAnalyzer(create_openai_client(settings), settings.openai_model)

    raise ValueError(f"Unsupported report provider: {settings.report_provider}")
