from datetime import date

from app.schemas.receipt import (
    ReceiptAnalysisRequest,
    ReceiptAnalysisResponse,
    ReceiptConfidence,
)
from app.schemas.report import (
    ReportHighlight,
    SpendingReportRequest,
    SpendingReportResponse,
)


class FakeReceiptAnalyzer:
    async def analyze(self, request: ReceiptAnalysisRequest) -> ReceiptAnalysisResponse:
        category = next(
            (
                candidate
                for candidate in request.category_candidates
                if candidate.name in {"食費", "食品", "外食"}
            ),
            request.category_candidates[0],
        )

        return ReceiptAnalysisResponse(
            provider="fake",
            merchant="セブン-イレブン",
            spent_at=date(2026, 7, 13),
            amount=1280,
            suggested_category_id=category.id,
            confidence=ReceiptConfidence(
                merchant=0.96,
                spent_at=0.94,
                amount=0.98,
                category=0.88,
                overall=0.94,
            ),
            extracted_text="セブン-イレブン\n2026/07/13\n合計 ¥1,280",
        )


class FakeSpendingReportAnalyzer:
    async def analyze(self, request: SpendingReportRequest) -> SpendingReportResponse:
        period_label = request.period.replace("-", "年", 1) + "月"
        highlights: list[ReportHighlight] = []
        recommendations: list[str] = []

        if request.categories:
            top_category = max(request.categories, key=lambda category: category.amount)
            highlights.append(
                ReportHighlight(
                    type="top_category",
                    title="最も支出が多いカテゴリー",
                    description=(
                        f"{top_category.name}に¥{top_category.amount:,}使い、"
                        f"全体の{top_category.percentage:.1f}%を占めています。"
                    ),
                    severity="info",
                )
            )
            recommendations.append(
                f"{top_category.name}の明細を見直し、削減できる支出がないか確認しましょう。"
            )

        if request.usage_rate >= 100:
            highlights.append(
                ReportHighlight(
                    type="budget",
                    title="予算を超過しています",
                    description=f"予算消化率は{request.usage_rate:.1f}%です。",
                    severity="warning",
                )
            )
            recommendations.append("残りの期間は必要な支出を優先し、追加支出を抑えましょう。")
        else:
            highlights.append(
                ReportHighlight(
                    type="budget",
                    title="予算の範囲内です",
                    description=(
                        f"予算消化率は{request.usage_rate:.1f}%で、"
                        f"残りは¥{request.remaining_amount:,}です。"
                    ),
                    severity="positive",
                )
            )

        if request.month_over_month_rate is not None:
            direction = "増加" if request.month_over_month_rate >= 0 else "減少"
            severity = "warning" if request.month_over_month_rate > 10 else "info"
            highlights.append(
                ReportHighlight(
                    type="month_over_month",
                    title=f"前月より支出が{direction}",
                    description=(
                        f"前月比は{abs(request.month_over_month_rate):.1f}%の{direction}です。"
                    ),
                    severity=severity,
                )
            )

        if request.subscription_total > 0:
            highlights.append(
                ReportHighlight(
                    type="subscription",
                    title="固定費の確認",
                    description=(
                        f"サブスクは¥{request.subscription_total:,}で、"
                        f"支出全体の{request.subscription_rate:.1f}%です。"
                    ),
                    severity="info",
                )
            )
            recommendations.append("利用頻度の低いサブスクがないか月に一度確認しましょう。")

        if request.total_spent == 0:
            summary = f"{period_label}はまだ支出データがありません。"
        elif request.categories:
            top_category = max(request.categories, key=lambda category: category.amount)
            summary = (
                f"{period_label}は合計¥{request.total_spent:,}を使いました。"
                f"最も支出が多いのは{top_category.name}です。"
            )
        else:
            summary = f"{period_label}は合計¥{request.total_spent:,}を使いました。"

        return SpendingReportResponse(
            provider="fake",
            period=request.period,
            summary=summary,
            highlights=highlights,
            recommendations=recommendations,
        )
