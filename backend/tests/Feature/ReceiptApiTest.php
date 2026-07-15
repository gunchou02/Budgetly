<?php

namespace Tests\Feature;

use App\Enums\ReceiptStatus;
use App\Models\Category;
use App\Models\Receipt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Testing\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use RuntimeException;
use Tests\TestCase;

class ReceiptApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
    }

    public function test_receipt_upload_requires_authentication(): void
    {
        $this->withHeader('Accept', 'application/json')
            ->post('/api/receipts', ['image' => $this->receiptImage()])
            ->assertUnauthorized();
    }

    public function test_user_can_upload_private_receipt_image(): void
    {
        [$user, $token] = $this->registerUser();

        $response = $this->uploadReceipt($token);

        $response
            ->assertCreated()
            ->assertJsonPath('data.status', ReceiptStatus::Queued->value)
            ->assertJsonPath('data.original_name', 'receipt.png')
            ->assertJsonPath('data.mime_type', 'image/png')
            ->assertJsonPath('data.analysis', null)
            ->assertJsonMissingPath('data.storage_disk')
            ->assertJsonMissingPath('data.image_path');

        $receipt = Receipt::firstOrFail();

        $this->assertSame($user->id, $receipt->user_id);
        $this->assertSame(ReceiptStatus::Queued, $receipt->status);
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', $receipt->job_id);
        $this->assertStringStartsWith("receipts/{$user->id}/", $receipt->image_path);
        Storage::disk('local')->assertExists($receipt->image_path);
        $this->assertDatabaseCount('expenses', 0);
    }

    public function test_receipt_upload_rejects_invalid_type_size_and_pixel_count(): void
    {
        [, $token] = $this->registerUser();

        $this->uploadReceipt(
            $token,
            UploadedFile::fake()->createWithContent('receipt.jpg', 'not-an-image')
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['image']);

        $this->uploadReceipt(
            $token,
            UploadedFile::fake()->createWithContent(
                'receipt.gif',
                base64_decode('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', true)
            )
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['image']);

        $this->uploadReceipt(
            $token,
            UploadedFile::fake()->create(
                'large.jpg',
                (int) config('budgetly.receipts.max_upload_kb') + 1,
                'image/jpeg'
            )
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['image']);

        config(['budgetly.receipts.max_pixels' => 0]);

        $this->uploadReceipt($token)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['image']);

        $this->assertDatabaseCount('receipts', 0);
    }

    public function test_receipt_upload_is_rate_limited_per_user(): void
    {
        [, $token] = $this->registerUser();
        config(['budgetly.receipts.upload_rate_per_minute' => 1]);

        $this->uploadReceipt($token)->assertCreated();
        $this->uploadReceipt($token)->assertTooManyRequests();

        $this->assertDatabaseCount('receipts', 1);
    }

    public function test_user_can_view_only_their_own_receipt_status(): void
    {
        [, $ownerToken] = $this->registerUser('owner@example.com');
        [, $otherToken] = $this->registerUser('other@example.com');
        $receiptId = $this->uploadReceipt($ownerToken)->json('data.id');

        $this->withFreshToken($ownerToken)
            ->getJson("/api/receipts/{$receiptId}")
            ->assertOk()
            ->assertJsonPath('data.status', ReceiptStatus::Queued->value);

        $this->withFreshToken($otherToken)
            ->getJson("/api/receipts/{$receiptId}")
            ->assertNotFound();
    }

    public function test_receipt_cannot_be_confirmed_before_analysis_review(): void
    {
        [$user, $token] = $this->registerUser();
        $category = $user->categories()->where('name', '食費')->firstOrFail();
        $receiptId = $this->uploadReceipt($token)->json('data.id');

        $this->withFreshToken($token)
            ->postJson("/api/receipts/{$receiptId}/confirm", $this->confirmationData($category))
            ->assertConflict();

        $this->assertDatabaseCount('expenses', 0);
        $this->assertDatabaseHas('receipts', [
            'id' => $receiptId,
            'status' => ReceiptStatus::Queued->value,
        ]);
    }

    public function test_reviewed_receipt_confirmation_is_idempotent(): void
    {
        [$user, $token] = $this->registerUser();
        $category = $user->categories()->where('name', '食費')->firstOrFail();
        $receipt = Receipt::findOrFail($this->uploadReceipt($token)->json('data.id'));
        $this->markAsReviewRequired($receipt, $category);

        $confirmation = [
            'category_id' => $category->id,
            'title' => 'コンビニでの買い物',
            'amount' => 1350,
            'spent_at' => '2026-07-14',
            'memo' => '内容を確認して修正',
        ];

        $firstResponse = $this->withFreshToken($token)
            ->postJson("/api/receipts/{$receipt->id}/confirm", $confirmation);

        $firstResponse
            ->assertCreated()
            ->assertJsonPath('data.status', ReceiptStatus::Confirmed->value)
            ->assertJsonPath('data.expense.title', 'コンビニでの買い物')
            ->assertJsonPath('data.expense.amount', 1350)
            ->assertJsonPath('data.expense.category.name', '食費');

        $expenseId = $firstResponse->json('data.expense.id');

        $this->withFreshToken($token)
            ->postJson("/api/receipts/{$receipt->id}/confirm", $confirmation)
            ->assertOk()
            ->assertJsonPath('data.expense.id', $expenseId);

        $this->assertDatabaseCount('expenses', 1);
        $this->assertDatabaseHas('receipts', [
            'id' => $receipt->id,
            'expense_id' => $expenseId,
            'status' => ReceiptStatus::Confirmed->value,
        ]);
    }

    public function test_receipt_confirmation_is_user_scoped(): void
    {
        [$owner, $ownerToken] = $this->registerUser('owner@example.com');
        [$other, $otherToken] = $this->registerUser('other@example.com');
        $ownerCategory = $owner->categories()->where('name', '食費')->firstOrFail();
        $otherCategory = $other->categories()->where('name', '食費')->firstOrFail();
        $receipt = Receipt::findOrFail($this->uploadReceipt($ownerToken)->json('data.id'));
        $this->markAsReviewRequired($receipt, $ownerCategory);

        $this->withFreshToken($otherToken)
            ->postJson(
                "/api/receipts/{$receipt->id}/confirm",
                $this->confirmationData($otherCategory)
            )
            ->assertNotFound();

        $this->withFreshToken($ownerToken)
            ->postJson(
                "/api/receipts/{$receipt->id}/confirm",
                $this->confirmationData($otherCategory)
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category_id']);

        $this->assertDatabaseCount('expenses', 0);
    }

    public function test_owner_can_delete_receipt_image_and_analysis(): void
    {
        [$owner, $ownerToken] = $this->registerUser('owner@example.com');
        [, $otherToken] = $this->registerUser('other@example.com');
        $category = $owner->categories()->where('name', '食費')->firstOrFail();
        $receipt = Receipt::findOrFail($this->uploadReceipt($ownerToken)->json('data.id'));
        $this->markAsReviewRequired($receipt, $category);
        $path = $receipt->image_path;

        $this->withFreshToken($otherToken)
            ->deleteJson("/api/receipts/{$receipt->id}")
            ->assertNotFound();

        Storage::disk('local')->assertExists($path);

        $this->withFreshToken($ownerToken)
            ->deleteJson("/api/receipts/{$receipt->id}")
            ->assertNoContent();

        Storage::disk('local')->assertMissing($path);
        $this->assertDatabaseMissing('receipts', ['id' => $receipt->id]);
        $this->assertDatabaseCount('receipt_analyses', 0);
    }

    public function test_deleting_confirmed_receipt_keeps_created_expense(): void
    {
        [$user, $token] = $this->registerUser();
        $category = $user->categories()->where('name', '食費')->firstOrFail();
        $receipt = Receipt::findOrFail($this->uploadReceipt($token)->json('data.id'));
        $this->markAsReviewRequired($receipt, $category);

        $expenseId = $this->withFreshToken($token)
            ->postJson(
                "/api/receipts/{$receipt->id}/confirm",
                $this->confirmationData($category)
            )
            ->assertCreated()
            ->json('data.expense.id');

        $this->withFreshToken($token)
            ->deleteJson("/api/receipts/{$receipt->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('receipts', ['id' => $receipt->id]);
        $this->assertDatabaseHas('expenses', ['id' => $expenseId]);
    }

    public function test_upload_removes_file_when_receipt_record_creation_fails(): void
    {
        [$user, $token] = $this->registerUser();
        Receipt::creating(fn () => throw new RuntimeException('Simulated database failure.'));
        $this->withoutExceptionHandling();

        try {
            $this->uploadReceipt($token);
            $this->fail('The simulated database failure was not thrown.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Simulated database failure.', $exception->getMessage());
        }

        $this->assertSame([], Storage::disk('local')->allFiles("receipts/{$user->id}"));
        $this->assertDatabaseCount('receipts', 0);
    }

    public function test_confirmation_rolls_back_expense_when_receipt_update_fails(): void
    {
        [$user, $token] = $this->registerUser();
        $category = $user->categories()->where('name', '食費')->firstOrFail();
        $receipt = Receipt::findOrFail($this->uploadReceipt($token)->json('data.id'));
        $this->markAsReviewRequired($receipt, $category);

        Receipt::updating(function (Receipt $updatingReceipt) use ($receipt): void {
            if ($updatingReceipt->is($receipt)) {
                throw new RuntimeException('Simulated receipt update failure.');
            }
        });
        $this->withoutExceptionHandling();

        try {
            $this->withFreshToken($token)
                ->postJson(
                    "/api/receipts/{$receipt->id}/confirm",
                    $this->confirmationData($category)
                );
            $this->fail('The simulated receipt update failure was not thrown.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Simulated receipt update failure.', $exception->getMessage());
        }

        $this->assertDatabaseCount('expenses', 0);
        $this->assertDatabaseHas('receipts', [
            'id' => $receipt->id,
            'expense_id' => null,
            'status' => ReceiptStatus::ReviewRequired->value,
        ]);
    }

    private function uploadReceipt(string $token, ?File $image = null): TestResponse
    {
        return $this->withFreshToken($token)
            ->withHeader('Accept', 'application/json')
            ->post('/api/receipts', [
                'image' => $image ?? $this->receiptImage(),
            ]);
    }

    private function receiptImage(): File
    {
        return UploadedFile::fake()->createWithContent(
            'receipt.png',
            base64_decode(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                true
            )
        );
    }

    private function markAsReviewRequired(Receipt $receipt, Category $category): void
    {
        $receipt->analysis()->create([
            'suggested_category_id' => $category->id,
            'provider' => 'fake',
            'merchant' => 'セブン-イレブン',
            'spent_at' => '2026-07-13',
            'amount' => 1280,
            'confidence' => [
                'merchant' => 0.96,
                'spent_at' => 0.94,
                'amount' => 0.98,
                'category' => 0.88,
                'overall' => 0.94,
            ],
            'extracted_text' => "セブン-イレブン\n2026/07/13\n合計 ¥1,280",
        ]);

        $receipt->update([
            'status' => ReceiptStatus::ReviewRequired,
            'analyzed_at' => now(),
        ]);
    }

    private function confirmationData(Category $category): array
    {
        return [
            'category_id' => $category->id,
            'title' => 'セブン-イレブン',
            'amount' => 1280,
            'spent_at' => '2026-07-13',
            'memo' => null,
        ];
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

    private function withFreshToken(string $token): static
    {
        Auth::forgetGuards();

        return $this->withToken($token);
    }
}
