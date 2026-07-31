from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import Field, PositiveInt, model_validator

from app.schemas.common import ApiModel


class CategoryCandidate(ApiModel):
    id: PositiveInt
    name: str = Field(min_length=1, max_length=100)


class ReceiptAnalysisRequest(ApiModel):
    job_id: UUID
    image_key: str = Field(min_length=1, max_length=500)
    mime_type: Literal["image/jpeg", "image/png", "image/webp"]
    language: Literal["ja"] = "ja"
    category_candidates: list[CategoryCandidate] = Field(min_length=1, max_length=100)


class BlobReceiptAnalysisRequest(ReceiptAnalysisRequest):
    @model_validator(mode="after")
    def validate_private_blob_path(self) -> BlobReceiptAnalysisRequest:
        extension = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        }[self.mime_type]
        parts = self.image_key.split("/")
        expected_path = (
            f"receipts/{parts[1]}/{self.job_id}.{extension}"
            if len(parts) == 3 and parts[1].isdigit()
            else ""
        )

        if self.image_key != expected_path:
            raise ValueError("image_key must be a scoped receipt Blob pathname")

        return self


class ReceiptConfidence(ApiModel):
    merchant: float = Field(ge=0, le=1)
    spent_at: float = Field(ge=0, le=1)
    amount: float = Field(ge=0, le=1)
    category: float = Field(ge=0, le=1)
    overall: float = Field(ge=0, le=1)


class ReceiptExtraction(ApiModel):
    merchant: str | None = Field(max_length=255)
    spent_at: date | None
    amount: PositiveInt | None
    suggested_category_id: PositiveInt | None
    confidence: ReceiptConfidence
    extracted_text: str = Field(max_length=16000)


class ReceiptAnalysisResponse(ReceiptExtraction):
    provider: str = Field(min_length=1, max_length=100)
