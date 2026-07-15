<?php

return [
    'url' => env('AI_SERVICE_URL', 'http://ai-service:8000'),
    'token' => env('AI_SERVICE_TOKEN'),
    'connect_timeout' => (int) env('AI_SERVICE_CONNECT_TIMEOUT', 3),
    'timeout' => (int) env('AI_SERVICE_TIMEOUT', 10),
    'max_extracted_text_length' => (int) env('AI_SERVICE_MAX_EXTRACTED_TEXT_LENGTH', 16000),
];
