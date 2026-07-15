<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RateLimiter::for('receipt-uploads', function (Request $request): Limit {
            $userKey = $request->user()?->getAuthIdentifier() ?? $request->ip();

            return Limit::perMinute(
                max(1, (int) config('budgetly.receipts.upload_rate_per_minute'))
            )->by("receipt-upload:{$userKey}");
        });
    }
}
