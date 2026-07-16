import asyncio
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from httpx import Request
from openai import APITimeoutError

from app.core.errors import ProviderResponseError, ProviderUnavailableError
from app.providers.openai import OpenAIReceiptAnalyzer, OpenAISpendingReportAnalyzer
from app.schemas.receipt import (
    ReceiptAnalysisRequest,
    ReceiptConfidence,
    ReceiptExtraction,
)
from app.schemas.report import (
    ReportHighlight,
    SpendingReportContent,
    SpendingReportRequest,
)
from app.services.images import ProcessedReceiptImage


def receipt_request() -> ReceiptAnalysisRequest:
    return ReceiptAnalysisRequest(
        job_id=uuid4(),
        image_key="receipts/1/sample.jpg",
        mime_type="image/jpeg",
        category_candidates=[
            {"id": 1, "name": "食費"},
            {"id": 2, "name": "交通費"},
        ],
    )


def report_request() -> SpendingReportRequest:
    return SpendingReportRequest(
        period="2026-07",
        budget_amount=200000,
        total_spent=126000,
        remaining_amount=74000,
        usage_rate=63.0,
        previous_month_total=114000,
        month_over_month_rate=10.5,
        subscription_total=12000,
        subscription_rate=9.5,
        categories=[
            {
                "name": "食費",
                "amount": 52000,
                "percentage": 41.3,
                "month_over_month_rate": 12.0,
            }
        ],
    )


def processed_image() -> ProcessedReceiptImage:
    return ProcessedReceiptImage(
        data=b"processed-jpeg",
        mime_type="image/jpeg",
        width=1024,
        height=768,
    )


def test_openai_receipt_provider_uses_structured_vision_request() -> None:
    extraction = ReceiptExtraction(
        merchant="テストストア",
        spent_at=date(2026, 7, 13),
        amount=1280,
        suggested_category_id=1,
        confidence=ReceiptConfidence(
            merchant=0.9,
            spent_at=0.8,
            amount=0.95,
            category=0.8,
            overall=0.86,
        ),
        extracted_text="テストストア\n合計 1,280円",
    )
    parse = AsyncMock(return_value=SimpleNamespace(output_parsed=extraction))
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))
    analyzer = OpenAIReceiptAnalyzer(client, "test-vision-model")

    result = asyncio.run(analyzer.analyze(receipt_request(), processed_image()))

    assert result.provider == "openai:test-vision-model"
    assert result.amount == 1280
    arguments = parse.await_args.kwargs
    assert arguments["store"] is False
    assert arguments["text_format"] is ReceiptExtraction
    image_input = arguments["input"][1]["content"][1]
    assert image_input["detail"] == "high"
    assert image_input["image_url"].startswith("data:image/jpeg;base64,")


def test_openai_receipt_provider_rejects_unknown_category() -> None:
    extraction = ReceiptExtraction(
        merchant=None,
        spent_at=None,
        amount=None,
        suggested_category_id=999,
        confidence=ReceiptConfidence(
            merchant=0,
            spent_at=0,
            amount=0,
            category=0,
            overall=0,
        ),
        extracted_text="",
    )
    client = SimpleNamespace(
        responses=SimpleNamespace(
            parse=AsyncMock(return_value=SimpleNamespace(output_parsed=extraction))
        )
    )

    with pytest.raises(ProviderResponseError):
        asyncio.run(
            OpenAIReceiptAnalyzer(client, "test-model").analyze(
                receipt_request(),
                processed_image(),
            )
        )


def test_openai_report_provider_keeps_laravel_period() -> None:
    content = SpendingReportContent(
        summary="7月は食費の割合が最も高くなっています。",
        highlights=[
            ReportHighlight(
                type="top_category",
                title="食費が最多",
                description="食費は52,000円です。",
                severity="info",
            )
        ],
        recommendations=["食費の明細を確認しましょう。"],
    )
    parse = AsyncMock(return_value=SimpleNamespace(output_parsed=content))
    client = SimpleNamespace(responses=SimpleNamespace(parse=parse))

    result = asyncio.run(
        OpenAISpendingReportAnalyzer(client, "test-report-model").analyze(
            report_request()
        )
    )

    assert result.provider == "openai:test-report-model"
    assert result.period == "2026-07"
    assert result.highlights[0].type == "top_category"
    assert parse.await_args.kwargs["text_format"] is SpendingReportContent


def test_openai_timeout_is_mapped_to_safe_provider_error() -> None:
    client = SimpleNamespace(
        responses=SimpleNamespace(
            parse=AsyncMock(
                side_effect=APITimeoutError(Request("POST", "https://api.openai.com"))
            )
        )
    )

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(
            OpenAIReceiptAnalyzer(client, "test-model").analyze(
                receipt_request(),
                processed_image(),
            )
        )
