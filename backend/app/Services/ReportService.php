<?php

namespace App\Services;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

class ReportService
{
    public function __construct(
        private readonly MonthlyBudgetReportService $monthlyBudgetReportService,
        private readonly SpendingReportAiClient $spendingReportAiClient
    ) {}

    public function categoryReport(User $user, int $year, int $month): array
    {
        $monthStart = CarbonImmutable::create($year, $month, 1, 0, 0, 0, config('app.timezone'));
        $monthEnd = $monthStart->endOfMonth();

        $categories = $user->categories()
            ->withSum(['expenses as monthly_total' => function ($query) use ($monthStart, $monthEnd): void {
                $query->whereBetween('spent_at', [$monthStart->toDateString(), $monthEnd->toDateString()]);
            }], 'amount')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $expenseTotal = (int) $categories->sum(fn ($category) => (int) ($category->monthly_total ?? 0));

        return [
            'year' => $year,
            'month' => $month,
            'expense_total' => $expenseTotal,
            'categories' => $categories
                ->map(function ($category) use ($expenseTotal): array {
                    $amount = (int) ($category->monthly_total ?? 0);

                    return [
                        'category_id' => $category->id,
                        'name' => $category->name,
                        'color' => $category->color,
                        'icon' => $category->icon,
                        'amount' => $amount,
                        'percentage' => $expenseTotal > 0 ? round($amount / $expenseTotal * 100, 1) : 0.0,
                    ];
                })
                ->filter(fn (array $category): bool => $category['amount'] > 0)
                ->values()
                ->all(),
        ];
    }

    public function monthlyReport(User $user, int $year): array
    {
        $months = collect(range(1, 12))
            ->map(fn (int $month): array => $this->monthlyBudgetReportService->build($user, $year, $month))
            ->map(function (array $report): array {
                return [
                    'year' => $report['year'],
                    'month' => $report['month'],
                    'budget' => $report['budget'],
                    'expense_total' => $report['expense_total'],
                    'subscription_total' => $report['subscription_total'],
                    'total_spent' => $report['total_spent'],
                    'remaining' => $report['remaining'],
                    'usage_rate' => $report['usage_rate'],
                    'status' => $report['status'],
                    'subscription_rate' => $report['total_spent'] > 0
                        ? round($report['subscription_total'] / $report['total_spent'] * 100, 1)
                        : 0.0,
                ];
            });

        $expenseTotal = (int) $months->sum('expense_total');
        $subscriptionTotal = (int) $months->sum('subscription_total');
        $totalSpent = (int) $months->sum('total_spent');

        return [
            'year' => $year,
            'summary' => [
                'expense_total' => $expenseTotal,
                'subscription_total' => $subscriptionTotal,
                'total_spent' => $totalSpent,
                'subscription_rate' => $totalSpent > 0 ? round($subscriptionTotal / $totalSpent * 100, 1) : 0.0,
            ],
            'months' => $months->values()->all(),
        ];
    }

    public function spendingInsights(User $user, int $year, int $month): array
    {
        $period = CarbonImmutable::create($year, $month, 1, 0, 0, 0, config('app.timezone'));
        $previousPeriod = $period->subMonth();
        $currentReport = $this->monthlyBudgetReportService->build($user, $year, $month);
        $previousReport = $this->monthlyBudgetReportService->build(
            $user,
            $previousPeriod->year,
            $previousPeriod->month
        );
        $currentCategories = $this->categoryReport($user, $year, $month)['categories'];
        $previousCategories = collect($this->categoryReport(
            $user,
            $previousPeriod->year,
            $previousPeriod->month
        )['categories'])->keyBy('category_id');

        $payload = [
            'period' => $period->format('Y-m'),
            'currency' => 'JPY',
            'budget_amount' => $currentReport['budget'],
            'total_spent' => $currentReport['total_spent'],
            'remaining_amount' => $currentReport['remaining'],
            'usage_rate' => $currentReport['usage_rate'],
            'previous_month_total' => $previousReport['total_spent'],
            'month_over_month_rate' => $this->changeRate(
                $currentReport['total_spent'],
                $previousReport['total_spent']
            ),
            'subscription_total' => $currentReport['subscription_total'],
            'subscription_rate' => $currentReport['total_spent'] > 0
                ? round($currentReport['subscription_total'] / $currentReport['total_spent'] * 100, 1)
                : 0.0,
            'categories' => collect($currentCategories)
                ->take(100)
                ->map(function (array $category) use ($previousCategories): array {
                    $previousAmount = (int) ($previousCategories->get($category['category_id'])['amount'] ?? 0);

                    return [
                        'name' => $category['name'],
                        'amount' => $category['amount'],
                        'percentage' => $category['percentage'],
                        'month_over_month_rate' => $this->changeRate(
                            $category['amount'],
                            $previousAmount
                        ),
                    ];
                })
                ->values()
                ->all(),
        ];

        $fingerprint = hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR));
        $cacheKey = "ai-report:v1:{$user->id}:{$fingerprint}";

        return Cache::remember(
            $cacheKey,
            max(60, (int) config('ai.report_cache_ttl_seconds')),
            fn (): array => $this->spendingReportAiClient->analyze($payload)
        );
    }

    private function changeRate(int $currentAmount, int $previousAmount): ?float
    {
        if ($previousAmount <= 0) {
            return null;
        }

        return round(($currentAmount - $previousAmount) / $previousAmount * 100, 1);
    }
}
