from uuid import uuid4

from fastapi.testclient import TestClient


def receipt_payload() -> dict[str, object]:
    return {
        "job_id": str(uuid4()),
        "image_key": "receipts/user-1/sample.jpg",
        "mime_type": "image/jpeg",
        "language": "ja",
        "category_candidates": [
            {"id": 1, "name": "住居費"},
            {"id": 2, "name": "食費"},
        ],
    }


def report_payload() -> dict[str, object]:
    return {
        "period": "2026-07",
        "currency": "JPY",
        "budget_amount": 200000,
        "total_spent": 126000,
        "remaining_amount": 74000,
        "usage_rate": 63.0,
        "previous_month_total": 114000,
        "month_over_month_rate": 10.5,
        "subscription_total": 12000,
        "subscription_rate": 9.5,
        "categories": [
            {
                "name": "食費",
                "amount": 52000,
                "percentage": 41.3,
                "month_over_month_rate": 12.0,
            },
            {
                "name": "交通費",
                "amount": 18000,
                "percentage": 14.3,
                "month_over_month_rate": -3.0,
            },
        ],
    }


def test_analysis_requires_internal_token(client: TestClient) -> None:
    response = client.post("/v1/receipts/analyze", json=receipt_payload())

    assert response.status_code == 401
    assert response.json()["error"] == {
        "code": "unauthorized",
        "message": "A valid internal service token is required.",
    }
    assert response.json()["request_id"] == response.headers["X-Request-ID"]


def test_receipt_validation_uses_common_error_shape(
    client: TestClient,
    internal_headers: dict[str, str],
) -> None:
    response = client.post(
        "/v1/receipts/analyze",
        headers=internal_headers,
        json={"mime_type": "application/pdf"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert response.json()["error"]["details"]


def test_fake_receipt_analysis(
    client: TestClient,
    internal_headers: dict[str, str],
) -> None:
    response = client.post(
        "/v1/receipts/analyze",
        headers=internal_headers,
        json=receipt_payload(),
    )

    assert response.status_code == 200
    assert response.json()["provider"] == "fake"
    assert response.json()["merchant"] == "セブン-イレブン"
    assert response.json()["amount"] == 1280
    assert response.json()["suggested_category_id"] == 2
    assert response.json()["confidence"]["overall"] == 0.94


def test_fake_spending_report_explains_top_category(
    client: TestClient,
    internal_headers: dict[str, str],
) -> None:
    response = client.post(
        "/v1/reports/analyze",
        headers=internal_headers,
        json=report_payload(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "fake"
    assert body["period"] == "2026-07"
    assert "食費" in body["summary"]
    assert body["highlights"][0]["type"] == "top_category"
    assert "¥52,000" in body["highlights"][0]["description"]
    assert body["recommendations"]
