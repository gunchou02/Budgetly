<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\DashboardRequest;
use App\Services\MonthlyBudgetReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class DashboardController extends Controller
{
    public function show(DashboardRequest $request, MonthlyBudgetReportService $reportService): JsonResponse
    {
        $validated = $request->validated();

        return response()->json([
            'data' => $reportService->build(
                $request->user(),
                (int) $validated['year'],
                (int) $validated['month']
            ),
        ]);
    }
}
