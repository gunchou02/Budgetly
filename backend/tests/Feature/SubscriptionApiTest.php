<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_list_show_update_cancel_and_delete_subscription(): void
    {
        [$user, $token] = $this->registerUser();
        $category = $user->categories()->where('name', 'サブスク')->firstOrFail();

        $createResponse = $this->withToken($token)
            ->postJson('/api/subscriptions', [
                'category_id' => $category->id,
                'name' => 'Netflix',
                'amount' => 1490,
                'billing_day' => 10,
                'started_at' => '2026-07-01',
                'memo' => '動画配信',
            ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'Netflix')
            ->assertJsonPath('data.amount', 1490)
            ->assertJsonPath('data.billing_cycle', 'monthly')
            ->assertJsonPath('data.category.name', 'サブスク');

        $subscriptionId = $createResponse->json('data.id');

        $this->withToken($token)
            ->getJson('/api/subscriptions?status=active')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Netflix');

        $this->withToken($token)
            ->getJson("/api/subscriptions/{$subscriptionId}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Netflix');

        $this->withToken($token)
            ->putJson("/api/subscriptions/{$subscriptionId}", [
                'category_id' => $category->id,
                'name' => 'Netflix Premium',
                'amount' => 1980,
                'billing_cycle' => 'monthly',
                'billing_day' => 15,
                'started_at' => '2026-07-01',
                'memo' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Netflix Premium')
            ->assertJsonPath('data.amount', 1980);

        $this->withToken($token)
            ->patchJson("/api/subscriptions/{$subscriptionId}/cancel", [
                'canceled_at' => '2026-07-20',
            ])
            ->assertOk();

        $this->assertDatabaseHas('subscriptions', [
            'id' => $subscriptionId,
            'canceled_at' => '2026-07-20 00:00:00',
        ]);

        $this->withToken($token)
            ->getJson('/api/subscriptions?status=active')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withToken($token)
            ->getJson('/api/subscriptions?status=canceled')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->withToken($token)
            ->deleteJson("/api/subscriptions/{$subscriptionId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('subscriptions', [
            'id' => $subscriptionId,
        ]);
    }

    public function test_subscription_index_can_filter_by_category(): void
    {
        [$user, $token] = $this->registerUser();
        $subscriptionCategory = $user->categories()->where('name', 'サブスク')->firstOrFail();
        $learningCategory = $user->categories()->where('name', '学習・自己投資')->firstOrFail();

        Subscription::create([
            'user_id' => $user->id,
            'category_id' => $subscriptionCategory->id,
            'name' => 'Netflix',
            'amount' => 1490,
            'billing_cycle' => 'monthly',
            'billing_day' => 10,
            'started_at' => '2026-07-01',
        ]);

        Subscription::create([
            'user_id' => $user->id,
            'category_id' => $learningCategory->id,
            'name' => 'Udemy',
            'amount' => 2000,
            'billing_cycle' => 'monthly',
            'billing_day' => 20,
            'started_at' => '2026-07-01',
        ]);

        $this->withToken($token)
            ->getJson("/api/subscriptions?category_id={$learningCategory->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Udemy');
    }

    public function test_user_cannot_use_another_users_category_for_subscription(): void
    {
        [, $token] = $this->registerUser('taro@example.com');
        [$other] = $this->registerUser('hanako@example.com');
        $otherCategory = $other->categories()->where('name', 'サブスク')->firstOrFail();

        $this->withToken($token)
            ->postJson('/api/subscriptions', [
                'category_id' => $otherCategory->id,
                'name' => '不正なサブスク',
                'amount' => 1000,
                'billing_day' => 10,
                'started_at' => '2026-07-01',
            ])
            ->assertUnprocessable();
    }

    public function test_user_cannot_access_another_users_subscription(): void
    {
        [$owner] = $this->registerUser('owner@example.com');
        [$other, $otherToken] = $this->registerUser('other@example.com');
        $ownerCategory = $owner->categories()->where('name', 'サブスク')->firstOrFail();
        $otherCategory = $other->categories()->where('name', 'サブスク')->firstOrFail();

        $subscription = Subscription::create([
            'user_id' => $owner->id,
            'category_id' => $ownerCategory->id,
            'name' => 'Netflix',
            'amount' => 1490,
            'billing_cycle' => 'monthly',
            'billing_day' => 10,
            'started_at' => '2026-07-01',
        ]);

        $this->withToken($otherToken)
            ->getJson("/api/subscriptions/{$subscription->id}")
            ->assertNotFound();

        $this->withToken($otherToken)
            ->putJson("/api/subscriptions/{$subscription->id}", [
                'category_id' => $otherCategory->id,
                'name' => '更新不可',
                'amount' => 1980,
                'billing_cycle' => 'monthly',
                'billing_day' => 15,
                'started_at' => '2026-07-01',
            ])
            ->assertNotFound();

        $this->withToken($otherToken)
            ->patchJson("/api/subscriptions/{$subscription->id}/cancel")
            ->assertNotFound();

        $this->withToken($otherToken)
            ->deleteJson("/api/subscriptions/{$subscription->id}")
            ->assertNotFound();
    }

    public function test_subscription_validation_rejects_invalid_values(): void
    {
        [$user, $token] = $this->registerUser();
        $category = $user->categories()->where('name', 'サブスク')->firstOrFail();

        $this->withToken($token)
            ->postJson('/api/subscriptions', [
                'category_id' => $category->id,
                'name' => '',
                'amount' => 0,
                'billing_cycle' => 'yearly',
                'billing_day' => 32,
                'started_at' => 'invalid-date',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'amount', 'billing_cycle', 'billing_day', 'started_at']);
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
