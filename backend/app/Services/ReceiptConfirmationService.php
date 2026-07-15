<?php

namespace App\Services;

use App\Enums\ReceiptStatus;
use App\Models\Receipt;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class ReceiptConfirmationService
{
    /**
     * @param  array{category_id: int, title: string, amount: int, spent_at: string, memo?: ?string}  $data
     * @return array{receipt: Receipt, created: bool}
     */
    public function confirm(User $user, int $receiptId, array $data): array
    {
        return DB::transaction(function () use ($user, $receiptId, $data): array {
            $receipt = $user->receipts()
                ->whereKey($receiptId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($receipt->status === ReceiptStatus::Confirmed) {
                if ($receipt->expense_id === null || ! $receipt->expense()->exists()) {
                    throw new ConflictHttpException('The confirmed expense is no longer available.');
                }

                return [
                    'receipt' => $this->loadRelations($receipt),
                    'created' => false,
                ];
            }

            if (
                $receipt->status !== ReceiptStatus::ReviewRequired
                || ! $receipt->analysis()->exists()
            ) {
                throw new ConflictHttpException('The receipt is not ready for confirmation.');
            }

            $expense = $user->expenses()->create($data);

            $receipt->update([
                'expense_id' => $expense->id,
                'status' => ReceiptStatus::Confirmed,
                'confirmed_at' => now(),
            ]);

            return [
                'receipt' => $this->loadRelations($receipt),
                'created' => true,
            ];
        });
    }

    private function loadRelations(Receipt $receipt): Receipt
    {
        return $receipt->refresh()->load([
            'analysis.suggestedCategory',
            'expense.category',
        ]);
    }
}
