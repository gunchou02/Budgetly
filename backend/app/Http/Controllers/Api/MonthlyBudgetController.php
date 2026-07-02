<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\MonthlyBudgetRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class MonthlyBudgetController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => ['required', 'integer', 'between:2000,2100'],
            'month' => ['required', 'integer', 'between:1,12'],
        ]);

        $budget = $request->user()
            ->monthlyBudgets()
            ->where('year', $validated['year'])
            ->where('month', $validated['month'])
            ->first();

        return response()->json([
            'data' => $budget,
        ]);
    }

    public function store(MonthlyBudgetRequest $request): JsonResponse
    {
        $budget = $request->user()->monthlyBudgets()->create($request->validated());

        return response()->json([
            'data' => $budget,
        ], 201);
    }

    public function update(MonthlyBudgetRequest $request, int $budget): JsonResponse
    {
        $monthlyBudget = $request->user()
            ->monthlyBudgets()
            ->whereKey($budget)
            ->firstOrFail();

        $monthlyBudget->update($request->validated());

        return response()->json([
            'data' => $monthlyBudget->fresh(),
        ]);
    }
}
