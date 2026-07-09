<?php

namespace App\Services;

use App\Models\User;
use Carbon\CarbonImmutable;

class ReportService
{
    public function __construct(
        private readonly MonthlyBudgetReportService $monthlyBudgetReportService
    ) {
    }

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
}
