<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\SubscriptionRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SubscriptionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:active,canceled,all'],
            'category_id' => ['nullable', 'integer'],
        ]);

        $subscriptions = $request->user()
            ->subscriptions()
            ->with('category')
            ->when(
                ($validated['status'] ?? 'all') === 'active',
                fn ($query) => $query->whereNull('canceled_at')
            )
            ->when(
                ($validated['status'] ?? 'all') === 'canceled',
                fn ($query) => $query->whereNotNull('canceled_at')
            )
            ->when(isset($validated['category_id']), fn ($query) => $query->where('category_id', $validated['category_id']))
            ->orderBy('billing_day')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $subscriptions,
        ]);
    }

    public function store(SubscriptionRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['billing_cycle'] ??= 'monthly';

        $subscription = $request->user()
            ->subscriptions()
            ->create($data)
            ->load('category');

        return response()->json([
            'data' => $subscription,
        ], 201);
    }

    public function show(Request $request, int $subscription): JsonResponse
    {
        $subscription = $request->user()
            ->subscriptions()
            ->with('category')
            ->whereKey($subscription)
            ->firstOrFail();

        return response()->json([
            'data' => $subscription,
        ]);
    }

    public function update(SubscriptionRequest $request, int $subscription): JsonResponse
    {
        $subscription = $request->user()
            ->subscriptions()
            ->whereKey($subscription)
            ->firstOrFail();

        $data = $request->validated();
        $data['billing_cycle'] ??= 'monthly';

        $subscription->update($data);

        return response()->json([
            'data' => $subscription->fresh('category'),
        ]);
    }

    public function cancel(Request $request, int $subscription): JsonResponse
    {
        $validated = $request->validate([
            'canceled_at' => ['nullable', 'date'],
        ]);

        $subscription = $request->user()
            ->subscriptions()
            ->whereKey($subscription)
            ->firstOrFail();

        $subscription->update([
            'canceled_at' => $validated['canceled_at'] ?? now()->toDateString(),
        ]);

        return response()->json([
            'data' => $subscription->fresh('category'),
        ]);
    }

    public function destroy(Request $request, int $subscription): JsonResponse
    {
        $subscription = $request->user()
            ->subscriptions()
            ->whereKey($subscription)
            ->firstOrFail();

        $subscription->delete();

        return response()->json(status: 204);
    }
}
