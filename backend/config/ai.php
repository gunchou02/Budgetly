<?php

return [
    'url' => env('AI_SERVICE_URL', 'http://ai-service:8000'),
    'token' => env('AI_SERVICE_TOKEN'),
    'timeout' => (int) env('AI_SERVICE_TIMEOUT', 10),
];
