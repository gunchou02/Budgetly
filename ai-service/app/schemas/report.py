from typing import Annotated, Literal

from pydantic import Field

from app.schemas.common import ApiModel


class CategorySpending(ApiModel):
    name: str = Field(min_length=1, max_length=100)
    amount: int = Field(ge=0)
    percentage: float = Field(ge=0, le=100)
    month_over_month_rate: float | None = None


class SpendingReportRequest(ApiModel):
    period: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    currency: Literal["JPY"] = "JPY"
    budget_amount: int = Field(ge=0)
    total_spent: int = Field(ge=0)
    remaining_amount: int
    usage_rate: float = Field(ge=0)
    previous_month_total: int = Field(ge=0)
    month_over_month_rate: float | None = None
    subscription_total: int = Field(ge=0)
    subscription_rate: float = Field(ge=0, le=100)
    categories: list[CategorySpending] = Field(max_length=100)


class ReportHighlight(ApiModel):
    type: Literal["top_category", "budget", "month_over_month", "subscription"]
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=1000)
    severity: Literal["info", "warning", "positive"]


class SpendingReportContent(ApiModel):
    summary: str = Field(min_length=1, max_length=1000)
    highlights: list[ReportHighlight] = Field(max_length=8)
    recommendations: list[Annotated[str, Field(min_length=1, max_length=500)]] = Field(
        max_length=8
    )


class SpendingReportResponse(SpendingReportContent):
    provider: str = Field(min_length=1, max_length=100)
    period: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
