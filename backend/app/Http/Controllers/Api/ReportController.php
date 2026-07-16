<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ReportAnalysisException;
use App\Http\Requests\CategoryReportRequest;
use App\Http\Requests\MonthlyReportRequest;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class ReportController extends Controller
{
    public function categories(CategoryReportRequest $request, ReportService $reportService): JsonResponse
    {
        $validated = $request->validated();

        return response()->json([
            'data' => $reportService->categoryReport(
                $request->user(),
                (int) $validated['year'],
                (int) $validated['month']
            ),
        ]);
    }

    public function monthly(MonthlyReportRequest $request, ReportService $reportService): JsonResponse
    {
        $validated = $request->validated();

        return response()->json([
            'data' => $reportService->monthlyReport($request->user(), (int) $validated['year']),
        ]);
    }

    public function insights(CategoryReportRequest $request, ReportService $reportService): JsonResponse
    {
        $validated = $request->validated();

        try {
            $insights = $reportService->spendingInsights(
                $request->user(),
                (int) $validated['year'],
                (int) $validated['month']
            );
        } catch (ReportAnalysisException $exception) {
            return response()->json([
                'message' => 'AIレポートを現在生成できません。しばらくしてから再試行してください。',
                'error' => ['code' => $exception->failureCode],
            ], 503);
        }

        return response()->json(['data' => $insights]);
    }
}
