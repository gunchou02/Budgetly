<?php

namespace App\Services;

use App\Enums\ReceiptStatus;
use App\Jobs\AnalyzeReceipt;
use App\Models\Receipt;
use App\Models\User;
use Illuminate\Bus\UniqueLock;
use Illuminate\Contracts\Bus\Dispatcher;
use Illuminate\Contracts\Cache\Factory as CacheFactory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Throwable;

class ReceiptQueueService
{
    public function __construct(
        private readonly Dispatcher $dispatcher,
        private readonly CacheFactory $cache
    ) {}

    public function enqueue(Receipt $receipt, bool $replaceExistingLock = false): bool
    {
        $job = new AnalyzeReceipt($receipt->id);
        $uniqueLock = new UniqueLock($this->cache->store('redis'));
        $lockAcquired = false;

        try {
            if ($replaceExistingLock) {
                $uniqueLock->release($job);
            }

            $lockAcquired = $uniqueLock->acquire($job);

            if (! $lockAcquired) {
                return true;
            }

            $this->dispatcher->dispatch($job);

            return true;
        } catch (Throwable $exception) {
            if ($lockAcquired) {
                try {
                    $uniqueLock->release($job);
                } catch (Throwable $releaseException) {
                    Log::warning('Receipt queue lock could not be released.', [
                        'receipt_id' => $receipt->id,
                        'exception' => $releaseException::class,
                    ]);
                }
            }

            Receipt::query()
                ->whereKey($receipt->id)
                ->where('status', ReceiptStatus::Queued->value)
                ->update([
                    'status' => ReceiptStatus::Failed->value,
                    'failure_code' => 'queue_unavailable',
                    'failure_message' => 'Receipt analysis could not be queued. Please retry later.',
                ]);

            Log::warning('Receipt analysis could not be queued.', [
                'receipt_id' => $receipt->id,
                'exception' => $exception::class,
            ]);

            return false;
        }
    }

    public function retry(User $user, int $receiptId): Receipt
    {
        $receipt = DB::transaction(function () use ($user, $receiptId): Receipt {
            $receipt = $user->receipts()
                ->whereKey($receiptId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($receipt->status !== ReceiptStatus::Failed) {
                throw new ConflictHttpException('Only failed receipt analyses can be retried.');
            }

            $receipt->analysis()->delete();
            $receipt->update([
                'status' => ReceiptStatus::Queued,
                'failure_code' => null,
                'failure_message' => null,
                'processing_started_at' => null,
                'analyzed_at' => null,
            ]);

            return $receipt;
        });

        $this->enqueue($receipt, replaceExistingLock: true);

        return $receipt->fresh()->load('analysis');
    }
}
