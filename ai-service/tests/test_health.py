from uuid import UUID, uuid4

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "Budgetly AI Service",
        "version": "0.1.0",
    }
    UUID(response.headers["X-Request-ID"])


def test_readiness_uses_fake_providers(client: TestClient) -> None:
    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "receipt_provider": "fake",
        "report_provider": "fake",
    }


def test_valid_request_id_is_preserved(client: TestClient) -> None:
    request_id = str(uuid4())

    response = client.get("/health", headers={"X-Request-ID": request_id})

    assert response.headers["X-Request-ID"] == request_id


def test_invalid_request_id_is_replaced(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "not-a-uuid"})

    assert response.headers["X-Request-ID"] != "not-a-uuid"
    UUID(response.headers["X-Request-ID"])
