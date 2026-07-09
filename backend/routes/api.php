<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\MonthlyBudgetController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Budgetly API',
        'locale' => config('app.locale'),
        'timezone' => config('app.timezone'),
    ]);
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/categories', [CategoryController::class, 'index']);

    Route::get('/budgets', [MonthlyBudgetController::class, 'show']);
    Route::post('/budgets', [MonthlyBudgetController::class, 'store']);
    Route::put('/budgets/{budget}', [MonthlyBudgetController::class, 'update']);

    Route::get('/expenses', [ExpenseController::class, 'index']);
    Route::post('/expenses', [ExpenseController::class, 'store']);
    Route::get('/expenses/{expense}', [ExpenseController::class, 'show']);
    Route::put('/expenses/{expense}', [ExpenseController::class, 'update']);
    Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy']);
});
