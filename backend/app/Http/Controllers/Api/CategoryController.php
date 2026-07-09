<?php

namespace App\Http\Controllers\Api;

use App\Services\DefaultCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request, DefaultCategoryService $defaultCategoryService): JsonResponse
    {
        $defaultCategoryService->createForUser(request()->user());

        $validated = $request->validate([
            'type' => ['nullable', Rule::in(['expense', 'fixed'])],
        ]);

        $categories = $request->user()
            ->categories()
            ->when($validated['type'] ?? null, fn ($query, string $type) => $query->where('type', $type))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('categories', 'name')->where('user_id', $request->user()->id),
            ],
            'type' => ['required', Rule::in(['expense', 'fixed'])],
        ]);

        $maxSortOrder = (int) $request->user()
            ->categories()
            ->where('type', $validated['type'])
            ->max('sort_order');

        $category = $request->user()->categories()->create([
            'name' => $validated['name'],
            'color' => $validated['type'] === 'fixed' ? '#DB2777' : '#71717A',
            'icon' => $validated['type'] === 'fixed' ? 'repeat' : 'more-horizontal',
            'type' => $validated['type'],
            'sort_order' => $maxSortOrder + 1,
            'is_default' => false,
        ]);

        return response()->json([
            'data' => $category,
        ], 201);
    }
}
