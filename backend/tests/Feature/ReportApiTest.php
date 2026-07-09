<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\MonthlyBudget;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_get_category_report_for_month(): void
    {
        [$user, $token] = $this->registerUser();
        $food = $user->categories()->where('name', '食費')->firstOrFail();
        $transport = $user->categories()->where('name', '交通費')->firstOrFail();

        Expense::create([
            'user_id' => $user->id,
            'category_id' => $food->id,
            'title' => 'ランチ',
            'amount' => 3000,
            'spent_at' => '2026-07-09',
        ]);

        Expense::create([
            'user_id' => $user->id,
            'category_id' => $transport->id,
            'title' => '電車',
            'amount' => 1000,
            'spent_at' => '2026-07-09',
        ]);

        Expense::create([
            'user_id' => $user->id,
            'category_id' => $food->id,
            'title' => '先月の食費',
            'amount' => 5000,
            'spent_at' => '2026-06-30',
        ]);

        $this->withToken($token)
            ->getJson('/api/reports/categories?year=2026&month=7')
            ->assertOk()
            ->assertJsonPath('data.expense_total', 4000)
            ->assertJsonCount(2, 'data.categories')
            ->assertJsonPath('data.categories.0.name', '食費')
            ->assertJsonPath('data.categories.0.amount', 3000)
            ->assertJsonPath('data.categories.0.percentage', 75)
            ->assertJsonPath('data.categories.1.name', '交通費')
            ->assertJsonPath('data.categories.1.amount', 1000)
            ->assertJsonPath('data.categories.1.percentage', 25);
    }

    public function test_category_report_uses_only_authenticated_users_data(): void
    {
        [$user, $token] = $this->registerUser('taro@example.com');
        [$other] = $this->registerUser('hanako@example.com');
        $userCategory = $user->categories()->where('name', '食費')->firstOrFail();
        $otherCategory = $other->categories()->where('name', '食費')->firstOrFail();

        Expense::create([
            'user_id' => $user->id,
            'category_id' => $userCategory->id,
            'title' => '本人支出',
            'amount' => 1000,
            'spent_at' => '2026-07-01',
        ]);

        Expense::create([
            'user_id' => $other->id,
            'category_id' => $otherCategory->id,
            'title' => '他人支出',
            'amount' => 9000,
            'spent_at' => '2026-07-01',
        ]);

        $this->withToken($token)
            ->getJson('/api/reports/categories?year=2026&month=7')
            ->assertOk()
            ->assertJsonPath('data.expense_total', 1000)
            ->assertJsonCount(1, 'data.categories');
    }

    public function test_user_can_get_monthly_report_for_year(): void
    {
        [$user, $token] = $this->registerUser();
        $food = $user->categories()->where('name', '食費')->firstOrFail();
        $subscriptionCategory = $user->categories()->where('name', 'サブスク')->firstOrFail();

        MonthlyBudget::create([
            'user_id' => $user->id,
            'year' => 2026,
            'month' => 7,
            'amount' => 10000,
        ]);

        Expense::create([
            'user_id' => $user->id,
            'category_id' => $food->id,
            'title' => 'ランチ',
            'amount' => 3000,
            'spent_at' => '2026-07-09',
        ]);

        Subscription::create([
            'user_id' => $user->id,
            'category_id' => $subscriptionCategory->id,
            'name' => 'Netflix',
            'amount' => 1000,
            'billing_cycle' => 'monthly',
            'billing_day' => 10,
            'started_at' => '2026-07-01',
        ]);

        $this->withToken($token)
            ->getJson('/api/reports/monthly?year=2026')
            ->assertOk()
            ->assertJsonPath('data.summary.expense_total', 3000)
            ->assertJsonPath('data.summary.subscription_total', 6000)
            ->assertJsonPath('data.summary.total_spent', 9000)
            ->assertJsonPath('data.summary.subscription_rate', 66.7)
            ->assertJsonCount(12, 'data.months')
            ->assertJsonPath('data.months.6.month', 7)
            ->assertJsonPath('data.months.6.budget', 10000)
            ->assertJsonPath('data.months.6.expense_total', 3000)
            ->assertJsonPath('data.months.6.subscription_total', 1000)
            ->assertJsonPath('data.months.6.total_spent', 4000)
            ->assertJsonPath('data.months.6.subscription_rate', 25);
    }

    public function test_report_requests_validate_required_parameters(): void
    {
        [, $token] = $this->registerUser();

        $this->withToken($token)
            ->getJson('/api/reports/categories')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['year', 'month']);

        $this->withToken($token)
            ->getJson('/api/reports/monthly')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['year']);
    }

    private function registerUser(string $email = 'taro@example.com'): array
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Taro Yamada',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $user = User::where('email', $email)->firstOrFail();

        return [$user, $response->json('data.token')];
    }
}
