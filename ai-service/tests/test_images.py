import asyncio
from io import BytesIO

import pytest
from fastapi import UploadFile
from PIL import Image
from starlette.datastructures import Headers

from app.core.config import Settings
from app.core.errors import InvalidReceiptImageError
from app.services.images import ReceiptImagePreprocessor


def test_preprocessor_resizes_and_removes_transparency() -> None:
    source = BytesIO()
    Image.new("RGBA", (3000, 1500), (255, 255, 255, 0)).save(source, format="PNG")
    upload = UploadFile(
        BytesIO(source.getvalue()),
        filename="receipt.png",
        headers=Headers({"content-type": "image/png"}),
    )
    settings = Settings(
        internal_api_token="test-internal-token",
        receipt_max_dimension=1024,
    )

    processed = asyncio.run(
        ReceiptImagePreprocessor(settings).process(upload, "image/png")
    )

    assert processed.mime_type == "image/jpeg"
    assert (processed.width, processed.height) == (1024, 512)
    with Image.open(BytesIO(processed.data)) as normalized:
        assert normalized.format == "JPEG"
        assert normalized.mode == "RGB"


def test_preprocessor_preserves_small_image_dimensions(receipt_jpeg: bytes) -> None:
    upload = UploadFile(
        BytesIO(receipt_jpeg),
        filename="receipt.jpg",
        headers=Headers({"content-type": "image/jpeg"}),
    )
    settings = Settings(internal_api_token="test-internal-token")

    processed = asyncio.run(
        ReceiptImagePreprocessor(settings).process(upload, "image/jpeg")
    )

    assert (processed.width, processed.height) == (640, 960)


def test_preprocessor_rejects_excessive_pixel_count() -> None:
    source = BytesIO()
    Image.new("RGB", (1100, 1100), "white").save(source, format="PNG")
    upload = UploadFile(
        BytesIO(source.getvalue()),
        filename="receipt.png",
        headers=Headers({"content-type": "image/png"}),
    )
    settings = Settings(
        internal_api_token="test-internal-token",
        receipt_max_pixels=1_000_000,
    )

    with pytest.raises(InvalidReceiptImageError):
        asyncio.run(ReceiptImagePreprocessor(settings).process(upload, "image/png"))
