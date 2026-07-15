<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\ConfirmReceiptRequest;
use App\Http\Requests\ReceiptUploadRequest;
use App\Services\ReceiptConfirmationService;
use App\Services\ReceiptStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ReceiptController extends Controller
{
    public function store(
        ReceiptUploadRequest $request,
        ReceiptStorageService $storageService
    ): JsonResponse {
        $receipt = $storageService->store(
            $request->user(),
            $request->file('image')
        );

        return response()->json([
            'data' => $receipt->load('analysis'),
        ], 201);
    }

    public function show(Request $request, int $receipt): JsonResponse
    {
        $receipt = $request->user()
            ->receipts()
            ->with(['analysis.suggestedCategory', 'expense.category'])
            ->whereKey($receipt)
            ->firstOrFail();

        return response()->json([
            'data' => $receipt,
        ]);
    }

    public function confirm(
        ConfirmReceiptRequest $request,
        int $receipt,
        ReceiptConfirmationService $confirmationService
    ): JsonResponse {
        $result = $confirmationService->confirm(
            $request->user(),
            $receipt,
            $request->validated()
        );

        return response()->json([
            'data' => $result['receipt'],
        ], $result['created'] ? 201 : 200);
    }

    public function destroy(
        Request $request,
        int $receipt,
        ReceiptStorageService $storageService
    ): JsonResponse {
        $receipt = $request->user()
            ->receipts()
            ->whereKey($receipt)
            ->firstOrFail();

        $storageService->delete($receipt);

        return response()->json(status: 204);
    }
}
