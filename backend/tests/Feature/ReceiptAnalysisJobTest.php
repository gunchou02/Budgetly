<?php

namespace Tests\Feature;

use App\Enums\ReceiptStatus;
use App\Exceptions\ReceiptAnalysisException;
use App\Jobs\AnalyzeReceipt;
use App\Models\Category;
use App\Models\Receipt;
use App\Models\User;
use App\Services\ReceiptAiClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class ReceiptAnalysisJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        config([
            'ai.url' => 'http://ai-service:8000',
            'ai.token' => 'test-internal-token',
            'ai.connect_timeout' => 1,
            'ai.timeout' => 2,
            'cache.stores.redis' => ['driver' => 'array'],
        ]);
    }

    public function test_job_saves_valid_analysis_once_and_requires_review(): void
    {
        [$user, $category] = $this->registerUserWithExpenseCategory();
        $receipt = $this->createReceipt($user);
        Http::fake([
            'http://ai-service:8000/v1/receipts/analyze' => Http::response(
                $this->validAnalysis($category),
                200
            ),
        ]);

        $job = new AnalyzeReceipt($receipt->id);
        $job->handle(app(ReceiptAiClient::class));

        $receipt->refresh();

        $this->assertSame(ReceiptStatus::ReviewRequired, $receipt->status);
        $this->assertNotNull($receipt->processing_started_at);
        $this->assertNotNull($receipt->analyzed_at);
        $this->assertDatabaseHas('receipt_analyses', [
            'receipt_id' => $receipt->id,
            'suggested_category_id' => $category->id,
            'provider' => 'fake',
            'merchant' => 'Sample Store',
            'amount' => 1280,
        ]);

        Http::assertSent(function (Request $request) use ($receipt, $category): bool {
            $data = $request->data();

            return $request->url() === 'http://ai-service:8000/v1/receipts/analyze'
                && $request->hasHeader('X-Internal-Token', 'test-internal-token')
                && $request->hasHeader('X-Request-ID', $receipt->job_id)
                && $data['job_id'] === $receipt->job_id
                && $data['image_key'] === $receipt->image_path
                && $data['category_candidates'][0]['id'] === $category->id;
        });

        $job->handle(app(ReceiptAiClient::class));
        $job->failed(new RuntimeException('A late duplicate failure.'));

        Http::assertSentCount(1);
        $this->assertDatabaseCount('receipt_analyses', 1);
        $this->assertDatabaseHas('receipts', [
            'id' => $receipt->id,
            'status' => ReceiptStatus::ReviewRequired->value,
            'failure_code' => null,
        ]);
    }

    public function test_job_can_resume_after_a_transient_ai_error(): void
    {
        [$user, $category] = $this->registerUserWithExpenseCategory();
        $receipt = $this->createReceipt($user);
        Http::fakeSequence()
            ->push(['message' => 'Temporarily unavailable.'], 503)
            ->push($this->validAnalysis($category), 200);
        $job = new AnalyzeReceipt($receipt->id);

        try {
            $job->handle(app(ReceiptAiClient::class));
            $this->fail('The simulated AI request failure was not thrown.');
        } catch (RequestException) {
            $this->assertDatabaseHas('receipts', [
                'id' => $receipt->id,
                'status' => ReceiptStatus::Processing->value,
            ]);
        }

        $job->handle(app(ReceiptAiClient::class));

        $this->assertDatabaseHas('receipts', [
            'id' => $receipt->id,
            'status' => ReceiptStatus::ReviewRequired->value,
        ]);
        $this->assertDatabaseCount('receipt_analyses', 1);
    }

    public function test_job_rejects_category_not_owned_by_receipt_user(): void
    {
        [$user, $category] = $this->registerUserWithExpenseCategory();
        $receipt = $this->createReceipt($user);
        $analysis = $this->validAnalysis($category);
        $analysis['suggested_category_id'] = $category->id + 100000;
        Http::fake([
            'http://ai-service:8000/v1/receipts/analyze' => Http::response($analysis, 200),
        ]);
        $job = new AnalyzeReceipt($receipt->id);

        try {
            $job->handle(app(ReceiptAiClient::class));
            $this->fail('The invalid AI response was not rejected.');
        } catch (ReceiptAnalysisException $exception) {
            $this->assertSame('invalid_ai_response', $exception->failureCode);
            $job->failed($exception);
        }

        $this->assertDatabaseHas('receipts', [
            'id' => $receipt->id,
            'status' => ReceiptStatus::Failed->value,
            'failure_code' => 'invalid_ai_response',
        ]);
        $this->assertDatabaseCount('receipt_analyses', 0);
    }

    private function registerUserWithExpenseCategory(): array
    {
        $this->postJson('/api/register', [
            'name' => 'Taro Yamada',
            'email' => 'taro@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated();

        $user = User::where('email', 'taro@example.com')->firstOrFail();
        $category = $user->categories()
            ->where('type', 'expense')
            ->orderBy('sort_order')
            ->firstOrFail();

        return [$user, $category];
    }

    private function createReceipt(User $user): Receipt
    {
        $jobId = (string) Str::uuid();
        $path = "receipts/{$user->id}/{$jobId}.png";
        Storage::disk('local')->put($path, 'test-image');

        return $user->receipts()->create([
            'job_id' => $jobId,
            'status' => ReceiptStatus::Queued,
            'storage_disk' => 'local',
            'image_path' => $path,
            'original_name' => 'receipt.png',
            'mime_type' => 'image/png',
            'file_size' => 10,
        ]);
    }

    private function validAnalysis(Category $category): array
    {
        return [
            'provider' => 'fake',
            'merchant' => 'Sample Store',
            'spent_at' => '2026-07-13',
            'amount' => 1280,
            'suggested_category_id' => $category->id,
            'confidence' => [
                'merchant' => 0.96,
                'spent_at' => 0.94,
                'amount' => 0.98,
                'category' => 0.88,
                'overall' => 0.94,
            ],
            'extracted_text' => "Sample Store\n2026/07/13\nTotal 1280",
        ];
    }
}
