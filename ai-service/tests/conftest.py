import os
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

os.environ["AI_INTERNAL_API_TOKEN"] = "test-internal-token"
os.environ["AI_ENVIRONMENT"] = "test"

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def internal_headers() -> dict[str, str]:
    return {"X-Internal-Token": "test-internal-token"}


@pytest.fixture
def receipt_jpeg() -> bytes:
    output = BytesIO()
    Image.new("RGB", (640, 960), "white").save(output, format="JPEG", quality=90)
    return output.getvalue()
