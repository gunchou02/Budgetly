<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MonthlyBudget;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthAndBudgetApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_default_categories_are_created(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Taro Yamada',
            'email' => 'taro@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.user.email', 'taro@example.com')
            ->assertJsonStructure(['data' => ['token']]);

        $user = User::where('email', 'taro@example.com')->firstOrFail();

        $this->assertSame(count(config('budgetly.default_categories')), $user->categories()->count());
        $this->assertSame('食費', $user->categories()->orderBy('sort_order')->first()->name);
    }

    public function test_duplicate_email_registration_fails(): void
    {
        User::create([
            'name' => 'Taro Yamada',
            'email' => 'taro@example.com',
            'password' => 'password123',
        ]);

        $this->postJson('/api/register', [
            'name' => 'Other User',
            'email' => 'taro@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertUnprocessable();
    }

    public function test_user_can_login_and_invalid_password_fails(): void
    {
        User::create([
            'name' => 'Taro Yamada',
            'email' => 'taro@example.com',
            'password' => Hash::make('password123'),
        ]);

        $this->postJson('/api/login', [
            'email' => 'taro@example.com',
            'password' => 'password123',
        ])
            ->assertOk()
            ->assertJsonStructure(['data' => ['token']]);

        $this->postJson('/api/login', [
            'email' => 'taro@example.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable();
    }

    public function test_authenticated_user_can_access_me_and_categories(): void
    {
        $token = $this->registerAndReturnToken();

        $this->getJson('/api/me')
            ->assertUnauthorized();

        $this->withToken($token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'taro@example.com');

        $this->withToken($token)
            ->getJson('/api/categories')
            ->assertOk()
            ->assertJsonCount(count(config('budgetly.default_categories')), 'data')
            ->assertJsonPath('data.0.name', '食費');
    }

    public function test_user_can_filter_and_create_fixed_categories(): void
    {
        $token = $this->registerAndReturnToken();

        $this->withToken($token)
            ->getJson('/api/categories?type=fixed')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'サブスク');

        $this->withToken($token)
            ->getJson('/api/categories?type=expense')
            ->assertOk()
            ->assertJsonPath('data.0.type', 'expense')
            ->assertJsonMissing(['name' => 'サブスク']);

        $this->withToken($token)
            ->postJson('/api/categories', [
                'name' => '駐車場',
                'type' => 'fixed',
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', '駐車場')
            ->assertJsonPath('data.type', 'fixed');
    }

    public function test_user_can_create_show_and_update_monthly_budget(): void
    {
        $token = $this->registerAndReturnToken();

        $createResponse = $this->withToken($token)
            ->postJson('/api/budgets', [
                'year' => 2026,
                'month' => 7,
                'amount' => 40000,
            ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.year', 2026)
            ->assertJsonPath('data.month', 7)
            ->assertJsonPath('data.amount', 40000);

        $budgetId = $createResponse->json('data.id');

        $this->withToken($token)
            ->postJson('/api/budgets', [
                'year' => 2026,
                'month' => 7,
                'amount' => 50000,
            ])
            ->assertUnprocessable();

        $this->withToken($token)
            ->getJson('/api/budgets?year=2026&month=7')
            ->assertOk()
            ->assertJsonPath('data.amount', 40000);

        $this->withToken($token)
            ->putJson("/api/budgets/{$budgetId}", [
                'year' => 2026,
                'month' => 7,
                'amount' => 45000,
            ])
            ->assertOk()
            ->assertJsonPath('data.amount', 45000);
    }

    public function test_user_cannot_update_another_users_budget(): void
    {
        $owner = User::create([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'password' => 'password123',
        ]);

        $other = User::create([
            'name' => 'Other',
            'email' => 'other@example.com',
            'password' => 'password123',
        ]);

        Category::create([
            'user_id' => $other->id,
            'name' => '食費',
            'color' => '#F97316',
            'icon' => 'utensils',
            'sort_order' => 1,
            'is_default' => true,
        ]);

        $budget = MonthlyBudget::create([
            'user_id' => $owner->id,
            'year' => 2026,
            'month' => 7,
            'amount' => 40000,
        ]);

        $token = $other->createToken('api')->plainTextToken;

        $this->withToken($token)
            ->putJson("/api/budgets/{$budget->id}", [
                'year' => 2026,
                'month' => 7,
                'amount' => 45000,
            ])
            ->assertNotFound();
    }

    private function registerAndReturnToken(): string
    {
        return $this->postJson('/api/register', [
            'name' => 'Taro Yamada',
            'email' => 'taro@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->json('data.token');
    }
}
