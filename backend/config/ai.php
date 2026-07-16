<?php

return [
    'url' => env('AI_SERVICE_URL', 'http://ai-service:8000'),
    'token' => env('AI_SERVICE_TOKEN'),
    'connect_timeout' => (int) env('AI_SERVICE_CONNECT_TIMEOUT', 3),
    'timeout' => (int) env('AI_SERVICE_TIMEOUT', 25),
    'report_timeout' => (int) env('AI_SERVICE_REPORT_TIMEOUT', 25),
    'report_rate_per_minute' => (int) env('AI_REPORT_RATE_PER_MINUTE', 10),
    'report_cache_ttl_seconds' => (int) env('AI_REPORT_CACHE_TTL_SECONDS', 21600),
    'max_extracted_text_length' => (int) env('AI_SERVICE_MAX_EXTRACTED_TEXT_LENGTH', 16000),
];
