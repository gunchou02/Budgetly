<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_list_show_update_and_delete_expense(): void
    {
        [$user, $token] = $this->registerUser();
        $category = $user->categories()->where('name', '食費')->firstOrFail();

        $createResponse = $this->withToken($token)
            ->postJson('/api/expenses', [
                'category_id' => $category->id,
                'title' => 'ランチ',
                'amount' => 1200,
                'spent_at' => '2026-07-09',
                'memo' => '駅前のカフェ',
            ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.title', 'ランチ')
            ->assertJsonPath('data.amount', 1200)
            ->assertJsonPath('data.category.name', '食費');

        $expenseId = $createResponse->json('data.id');

        $this->withToken($token)
            ->getJson('/api/expenses?year=2026&month=7')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'ランチ');

        $this->withToken($token)
            ->getJson("/api/expenses/{$expenseId}")
            ->assertOk()
            ->assertJsonPath('data.title', 'ランチ');

        $this->withToken($token)
            ->putJson("/api/expenses/{$expenseId}", [
                'category_id' => $category->id,
                'title' => '夕食',
                'amount' => 1800,
                'spent_at' => '2026-07-10',
                'memo' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.title', '夕食')
            ->assertJsonPath('data.amount', 1800);

        $this->withToken($token)
            ->deleteJson("/api/expenses/{$expenseId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('expenses', [
            'id' => $expenseId,
        ]);
    }

    public function test_expense_index_can_filter_by_category(): void
    {
        [$user, $token] = $this->registerUser();
        $food = $user->categories()->where('name', '食費')->firstOrFail();
        $transport = $user->categories()->where('name', '交通費')->firstOrFail();

        Expense::create([
            'user_id' => $user->id,
            'category_id' => $food->id,
            'title' => 'ランチ',
            'amount' => 1200,
            'spent_at' => '2026-07-09',
        ]);

        Expense::create([
            'user_id' => $user->id,
            'category_id' => $transport->id,
            'title' => '電車',
            'amount' => 300,
            'spent_at' => '2026-07-09',
        ]);

        $this->withToken($token)
            ->getJson("/api/expenses?year=2026&month=7&category_id={$food->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'ランチ');
    }

    public function test_user_cannot_use_another_users_category_for_expense(): void
    {
        [, $token] = $this->registerUser('taro@example.com');
        [$other] = $this->registerUser('hanako@example.com');
        $otherCategory = $other->categories()->where('name', '食費')->firstOrFail();

        $this->withToken($token)
            ->postJson('/api/expenses', [
                'category_id' => $otherCategory->id,
                'title' => '不正な支出',
                'amount' => 1000,
                'spent_at' => '2026-07-09',
            ])
            ->assertUnprocessable();
    }

    public function test_user_cannot_access_another_users_expense(): void
    {
        [$owner] = $this->registerUser('owner@example.com');
        [, $otherToken] = $this->registerUser('other@example.com');
        $category = $owner->categories()->where('name', '食費')->firstOrFail();

        $expense = Expense::create([
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'title' => 'ランチ',
            'amount' => 1200,
            'spent_at' => '2026-07-09',
        ]);

        $this->withToken($otherToken)
            ->getJson("/api/expenses/{$expense->id}")
            ->assertNotFound();

        $this->withToken($otherToken)
            ->putJson("/api/expenses/{$expense->id}", [
                'category_id' => $category->id,
                'title' => '更新不可',
                'amount' => 1500,
                'spent_at' => '2026-07-10',
            ])
            ->assertUnprocessable();

        $this->withToken($otherToken)
            ->deleteJson("/api/expenses/{$expense->id}")
            ->assertNotFound();
    }

    public function test_expense_validation_rejects_invalid_amount_and_date(): void
    {
        [$user, $token] = $this->registerUser();
        $category = $user->categories()->where('name', '食費')->firstOrFail();

        $this->withToken($token)
            ->postJson('/api/expenses', [
                'category_id' => $category->id,
                'title' => '',
                'amount' => 0,
                'spent_at' => 'invalid-date',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'amount', 'spent_at']);
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
