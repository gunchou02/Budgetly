<?php

return [
    'name' => env('APP_NAME', 'Budgetly'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'timezone' => env('APP_TIMEZONE', 'Asia/Tokyo'),
    'locale' => env('APP_LOCALE', 'ja'),
    'fallback_locale' => env('APP_FALLBACK_LOCALE', 'ja'),
    'faker_locale' => env('APP_FAKER_LOCALE', 'ja_JP'),
    'key' => env('APP_KEY'),
    'cipher' => 'AES-256-CBC',
];
