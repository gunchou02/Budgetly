<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\ExpenseRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => ['nullable', 'integer', 'between:2000,2100'],
            'month' => ['nullable', 'integer', 'between:1,12'],
            'category_id' => ['nullable', 'integer'],
        ]);

        $expenses = $request->user()
            ->expenses()
            ->with('category')
            ->when(isset($validated['year']), fn ($query) => $query->whereYear('spent_at', $validated['year']))
            ->when(isset($validated['month']), fn ($query) => $query->whereMonth('spent_at', $validated['month']))
            ->when(isset($validated['category_id']), fn ($query) => $query->where('category_id', $validated['category_id']))
            ->orderByDesc('spent_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $expenses,
        ]);
    }

    public function store(ExpenseRequest $request): JsonResponse
    {
        $expense = $request->user()
            ->expenses()
            ->create($request->validated())
            ->load('category');

        return response()->json([
            'data' => $expense,
        ], 201);
    }

    public function show(Request $request, int $expense): JsonResponse
    {
        $expense = $request->user()
            ->expenses()
            ->with('category')
            ->whereKey($expense)
            ->firstOrFail();

        return response()->json([
            'data' => $expense,
        ]);
    }

    public function update(ExpenseRequest $request, int $expense): JsonResponse
    {
        $expense = $request->user()
            ->expenses()
            ->whereKey($expense)
            ->firstOrFail();

        $expense->update($request->validated());

        return response()->json([
            'data' => $expense->fresh('category'),
        ]);
    }

    public function destroy(Request $request, int $expense): JsonResponse
    {
        $expense = $request->user()
            ->expenses()
            ->whereKey($expense)
            ->firstOrFail();

        $expense->delete();

        return response()->json(status: 204);
    }
}
