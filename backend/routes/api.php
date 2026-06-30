<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'Budgetly API',
        'locale' => config('app.locale'),
        'timezone' => config('app.timezone'),
    ]);
});
