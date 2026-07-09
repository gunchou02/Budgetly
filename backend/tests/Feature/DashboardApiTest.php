<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\MonthlyBudget;
use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_user_can_get_monthly_dashboard_summary(): void
    {
        [$user, $token] = $this->registerUser();
        $food = $user->categories()->where('name', '食費')->firstOrFail();
        $subscriptionCategory = $user->categories()->where('name', 'サブスク')->firstOrFail();

        MonthlyBudget::create([
            'user_id' => $user->id,
            'year' => 2099,
            'month' => 7,
            'amount' => 40000,
        ]);

        Expense::create([
            'user_id' => $user->id,
            'category_id' => $food->id,
            'title' => 'ランチ',
            'amount' => 10000,
            'spent_at' => '2099-07-09',
        ]);

        Expense::create([
            'user_id' => $user->id,
            'category_id' => $food->id,
            'title' => '先月の支出',
            'amount' => 50000,
            'spent_at' => '2099-06-30',
        ]);

        Subscription::create([
            'user_id' => $user->id,
            'category_id' => $subscriptionCategory->id,
            'name' => 'Netflix',
            'amount' => 2000,
            'billing_cycle' => 'monthly',
            'billing_day' => 10,
            'started_at' => '2099-07-01',
        ]);

        $this->withToken($token)
            ->getJson('/api/dashboard?year=2099&month=7')
            ->assertOk()
            ->assertJsonPath('data.budget', 40000)
            ->assertJsonPath('data.expense_total', 10000)
            ->assertJsonPath('data.subscription_total', 2000)
            ->assertJsonPath('data.total_spent', 12000)
            ->assertJsonPath('data.remaining', 28000)
            ->assertJsonPath('data.usage_rate', 30)
            ->assertJsonPath('data.status', 'safe')
            ->assertJsonPath('data.daily_available_amount', 903);
    }

    public function test_dashboard_returns_warning_and_over_budget_statuses(): void
    {
        [$user, $token] = $this->registerUser();
        $category = $user->categories()->where('name', '食費')->firstOrFail();

        MonthlyBudget::create([
            'user_id' => $user->id,
            'year' => 2026,
            'month' => 7,
            'amount' => 10000,
        ]);

        Expense::create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'title' => '食費',
            'amount' => 7000,
            'spent_at' => '2026-07-01',
        ]);

        $this->withToken($token)
            ->getJson('/api/dashboard?year=2026&month=7')
            ->assertOk()
            ->assertJsonPath('data.usage_rate', 70)
            ->assertJsonPath('data.status', 'warning');

        Expense::create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'title' => '追加支出',
            'amount' => 3000,
            'spent_at' => '2026-07-02',
        ]);

        $this->withToken($token)
            ->getJson('/api/dashboard?year=2026&month=7')
            ->assertOk()
            ->assertJsonPath('data.usage_rate', 100)
            ->assertJsonPath('data.status', 'over_budget');
    }

    public function test_dashboard_counts_subscription_only_when_billing_date_is_active(): void
    {
        [$user, $token] = $this->registerUser();
        $category = $user->categories()->where('name', 'サブスク')->firstOrFail();

        MonthlyBudget::create([
            'user_id' => $user->id,
            'year' => 2026,
            'month' => 7,
            'amount' => 10000,
        ]);

        Subscription::create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'name' => 'Counted',
            'amount' => 1000,
            'billing_cycle' => 'monthly',
            'billing_day' => 10,
            'started_at' => '2026-07-01',
            'canceled_at' => '2026-07-20',
        ]);

        Subscription::create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'name' => 'Canceled before billing',
            'amount' => 2000,
            'billing_cycle' => 'monthly',
            'billing_day' => 10,
            'started_at' => '2026-07-01',
            'canceled_at' => '2026-07-05',
        ]);

        Subscription::create([
            'user_id' => $user->id,
            'category_id' => $category->id,
            'name' => 'Started after billing',
            'amount' => 3000,
            'billing_cycle' => 'monthly',
            'billing_day' => 10,
            'started_at' => '2026-07-11',
        ]);

        $this->withToken($token)
            ->getJson('/api/dashboard?year=2026&month=7')
            ->assertOk()
            ->assertJsonPath('data.subscription_total', 1000);
    }

    public function test_dashboard_uses_only_authenticated_users_data(): void
    {
        [$user, $token] = $this->registerUser('taro@example.com');
        [$other] = $this->registerUser('hanako@example.com');
        $userCategory = $user->categories()->where('name', '食費')->firstOrFail();
        $otherCategory = $other->categories()->where('name', '食費')->firstOrFail();

        MonthlyBudget::create([
            'user_id' => $user->id,
            'year' => 2026,
            'month' => 7,
            'amount' => 10000,
        ]);

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
            ->getJson('/api/dashboard?year=2026&month=7')
            ->assertOk()
            ->assertJsonPath('data.expense_total', 1000)
            ->assertJsonPath('data.total_spent', 1000);
    }

    public function test_dashboard_requires_year_and_month(): void
    {
        [, $token] = $this->registerUser();

        $this->withToken($token)
            ->getJson('/api/dashboard')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['year', 'month']);
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
