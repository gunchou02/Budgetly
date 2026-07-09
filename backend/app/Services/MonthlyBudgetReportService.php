<?php

namespace App\Services;

use App\Models\User;
use Carbon\CarbonImmutable;

class MonthlyBudgetReportService
{
    public function build(User $user, int $year, int $month): array
    {
        $monthStart = CarbonImmutable::create($year, $month, 1, 0, 0, 0, config('app.timezone'));
        $monthEnd = $monthStart->endOfMonth();

        $budgetAmount = (int) ($user->monthlyBudgets()
            ->where('year', $year)
            ->where('month', $month)
            ->value('amount') ?? 0);

        $expenseTotal = (int) $user->expenses()
            ->whereBetween('spent_at', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->sum('amount');

        $subscriptionTotal = $this->calculateSubscriptionTotal($user, $monthStart, $monthEnd);
        $totalSpent = $expenseTotal + $subscriptionTotal;
        $remaining = $budgetAmount - $totalSpent;
        $usageRate = $budgetAmount > 0 ? round($totalSpent / $budgetAmount * 100, 1) : 0.0;

        return [
            'year' => $year,
            'month' => $month,
            'budget' => $budgetAmount,
            'expense_total' => $expenseTotal,
            'subscription_total' => $subscriptionTotal,
            'total_spent' => $totalSpent,
            'remaining' => $remaining,
            'usage_rate' => $usageRate,
            'status' => $this->resolveStatus($budgetAmount, $totalSpent, $usageRate),
            'daily_available_amount' => $this->calculateDailyAvailableAmount($monthStart, $monthEnd, $remaining),
        ];
    }

    private function calculateSubscriptionTotal(User $user, CarbonImmutable $monthStart, CarbonImmutable $monthEnd): int
    {
        return (int) $user->subscriptions()
            ->whereDate('started_at', '<=', $monthEnd->toDateString())
            ->get()
            ->filter(function ($subscription) use ($monthStart): bool {
                $billingDate = $monthStart->day(min($subscription->billing_day, $monthStart->daysInMonth));

                if ($subscription->started_at->greaterThan($billingDate)) {
                    return false;
                }

                return $subscription->canceled_at === null || $subscription->canceled_at->greaterThanOrEqualTo($billingDate);
            })
            ->sum('amount');
    }

    private function resolveStatus(int $budgetAmount, int $totalSpent, float $usageRate): string
    {
        if ($budgetAmount <= 0) {
            return $totalSpent > 0 ? 'over_budget' : 'safe';
        }

        if ($usageRate >= 100) {
            return 'over_budget';
        }

        if ($usageRate >= 70) {
            return 'warning';
        }

        return 'safe';
    }

    private function calculateDailyAvailableAmount(CarbonImmutable $monthStart, CarbonImmutable $monthEnd, int $remaining): int
    {
        $today = CarbonImmutable::now(config('app.timezone'))->startOfDay();

        if ($today->lt($monthStart)) {
            $remainingDays = $monthStart->daysInMonth;
        } elseif ($today->gt($monthEnd)) {
            $remainingDays = 0;
        } else {
            $remainingDays = $today->diffInDays($monthEnd) + 1;
        }

        if ($remainingDays <= 0) {
            return 0;
        }

        return (int) floor($remaining / $remainingDays);
    }
}
