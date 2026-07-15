<?php

namespace App\Jobs;

use App\Enums\ReceiptStatus;
use App\Exceptions\ReceiptAnalysisException;
use App\Models\Receipt;
use App\Models\ReceiptAnalysis;
use App\Services\ReceiptAiClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class AnalyzeReceipt implements ShouldBeUniqueUntilProcessing, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 30;

    public bool $failOnTimeout = true;

    public int $uniqueFor = 120;

    public function __construct(public readonly int $receiptId)
    {
        $this->onConnection('redis');
        $this->onQueue((string) config('queue.connections.redis.queue', 'receipts'));
        $this->afterCommit();
    }

    public function uniqueId(): string
    {
        return (string) $this->receiptId;
    }

    public function uniqueVia(): CacheRepository
    {
        return Cache::store('redis');
    }

    public function middleware(): array
    {
        return [
            (new WithoutOverlapping("receipt:{$this->receiptId}"))
                ->releaseAfter(5)
                ->expireAfter(45)
                ->shared(),
        ];
    }

    public function backoff(): array
    {
        return [5, 15, 30];
    }

    public function handle(ReceiptAiClient $client): void
    {
        $receipt = $this->claimReceipt();

        if ($receipt === null) {
            return;
        }

        $analysis = $client->analyze($receipt);

        DB::transaction(function () use ($analysis): void {
            $receipt = Receipt::query()
                ->lockForUpdate()
                ->find($this->receiptId);

            if ($receipt === null || $receipt->status !== ReceiptStatus::Processing) {
                return;
            }

            ReceiptAnalysis::query()->updateOrCreate(
                ['receipt_id' => $receipt->id],
                [
                    'suggested_category_id' => $analysis['suggested_category_id'],
                    'provider' => $analysis['provider'],
                    'merchant' => $analysis['merchant'],
                    'spent_at' => $analysis['spent_at'],
                    'amount' => $analysis['amount'],
                    'confidence' => $analysis['confidence'],
                    'extracted_text' => $analysis['extracted_text'],
                ]
            );

            $receipt->update([
                'status' => ReceiptStatus::ReviewRequired,
                'failure_code' => null,
                'failure_message' => null,
                'analyzed_at' => now(),
            ]);
        });
    }

    public function failed(?Throwable $exception): void
    {
        [$failureCode, $failureMessage] = $this->failureDetails($exception);

        DB::transaction(function () use ($failureCode, $failureMessage): void {
            $receipt = Receipt::query()
                ->lockForUpdate()
                ->find($this->receiptId);

            if ($receipt === null || ! in_array($receipt->status, [
                ReceiptStatus::Queued,
                ReceiptStatus::Processing,
            ], true)) {
                return;
            }

            $receipt->analysis()->delete();
            $receipt->update([
                'status' => ReceiptStatus::Failed,
                'failure_code' => $failureCode,
                'failure_message' => $failureMessage,
                'analyzed_at' => null,
            ]);
        });

        Log::error('Receipt analysis job failed.', [
            'receipt_id' => $this->receiptId,
            'failure_code' => $failureCode,
            'exception' => $exception ? $exception::class : null,
        ]);
    }

    private function claimReceipt(): ?Receipt
    {
        return DB::transaction(function (): ?Receipt {
            $receipt = Receipt::query()
                ->lockForUpdate()
                ->find($this->receiptId);

            if ($receipt === null || ! in_array($receipt->status, [
                ReceiptStatus::Queued,
                ReceiptStatus::Processing,
            ], true)) {
                return null;
            }

            $receipt->update([
                'status' => ReceiptStatus::Processing,
                'failure_code' => null,
                'failure_message' => null,
                'processing_started_at' => $receipt->processing_started_at ?? now(),
            ]);

            return $receipt->fresh();
        });
    }

    private function failureDetails(?Throwable $exception): array
    {
        if ($exception instanceof ReceiptAnalysisException) {
            return [$exception->failureCode, $exception->getMessage()];
        }

        if ($exception instanceof ConnectionException) {
            return ['ai_unavailable', 'The receipt analysis service is temporarily unavailable.'];
        }

        if ($exception instanceof RequestException) {
            return ['ai_request_failed', 'The receipt analysis service could not process the image.'];
        }

        return ['analysis_failed', 'The receipt could not be analyzed.'];
    }
}
