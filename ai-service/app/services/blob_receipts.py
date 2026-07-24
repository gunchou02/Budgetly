from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends
from vercel.blob import AsyncBlobClient

from app.core.config import Settings, get_settings
from app.core.errors import (
    InvalidReceiptImageError,
    ReceiptSourceUnavailableError,
)


@dataclass(frozen=True, slots=True)
class ReceiptBlob:
    data: bytes
    mime_type: str


class ReceiptBlobReader:
    def __init__(self, client: AsyncBlobClient, max_bytes: int) -> None:
        self._client = client
        self._max_bytes = max_bytes

    async def read(self, pathname: str) -> ReceiptBlob:
        try:
            metadata = await self._client.head(pathname)
        except Exception as exception:
            raise ReceiptSourceUnavailableError from exception

        if (
            metadata.pathname != pathname
            or metadata.size <= 0
            or metadata.size > self._max_bytes
        ):
            raise InvalidReceiptImageError

        try:
            result = await self._client.get(
                pathname,
                access="private",
                use_cache=False,
            )
        except Exception as exception:
            raise ReceiptSourceUnavailableError from exception

        if (
            result.status_code != 200
            or result.pathname != pathname
            or not result.content
            or len(result.content) > self._max_bytes
            or result.size != len(result.content)
        ):
            raise InvalidReceiptImageError

        return ReceiptBlob(
            data=result.content,
            mime_type=result.content_type or "",
        )


def get_receipt_blob_reader(
    settings: Annotated[Settings, Depends(get_settings)],
) -> ReceiptBlobReader:
    return ReceiptBlobReader(
        AsyncBlobClient(),
        max_bytes=settings.receipt_max_bytes,
    )
