from typing import Literal

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
    title: str
    description: str
    severity: Literal["info", "warning", "positive"]


class SpendingReportResponse(ApiModel):
    provider: str
    period: str
    summary: str
    highlights: list[ReportHighlight]
    recommendations: list[str]
