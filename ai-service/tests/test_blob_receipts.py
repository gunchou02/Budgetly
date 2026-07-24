import asyncio
from types import SimpleNamespace

import pytest

from app.core.errors import InvalidReceiptImageError
from app.services.blob_receipts import ReceiptBlobReader


class StubBlobClient:
    def __init__(self, content: bytes) -> None:
        self.content = content
        self.get_called = False

    async def head(self, pathname: str) -> SimpleNamespace:
        return SimpleNamespace(
            pathname=pathname,
            size=len(self.content),
        )

    async def get(
        self,
        pathname: str,
        *,
        access: str,
        use_cache: bool,
    ) -> SimpleNamespace:
        self.get_called = True
        assert access == "private"
        assert use_cache is False

        return SimpleNamespace(
            status_code=200,
            pathname=pathname,
            content=self.content,
            content_type="image/jpeg",
            size=len(self.content),
        )


def test_blob_reader_uses_current_vercel_sdk_result_shape() -> None:
    client = StubBlobClient(b"receipt-image")
    reader = ReceiptBlobReader(client, max_bytes=1024)  # type: ignore[arg-type]

    result = asyncio.run(reader.read("receipts/1/job.jpg"))

    assert result.data == b"receipt-image"
    assert result.mime_type == "image/jpeg"
    assert client.get_called is True


def test_blob_reader_rejects_oversized_metadata_before_download() -> None:
    client = StubBlobClient(b"too-large")
    reader = ReceiptBlobReader(client, max_bytes=2)  # type: ignore[arg-type]

    with pytest.raises(InvalidReceiptImageError):
        asyncio.run(reader.read("receipts/1/job.jpg"))

    assert client.get_called is False
