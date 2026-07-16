<?php

namespace App\Services;

use App\Exceptions\ReportAnalysisException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

class SpendingReportAiClient
{
    public function analyze(array $payload): array
    {
        $url = rtrim((string) config('ai.url'), '/');
        $token = (string) config('ai.token');

        if (filter_var($url, FILTER_VALIDATE_URL) === false || $token === '') {
            throw new ReportAnalysisException(
                'ai_configuration_error',
                'The spending report service is not configured.'
            );
        }

        try {
            $response = Http::acceptJson()
                ->withHeaders(['X-Internal-Token' => $token])
                ->connectTimeout(max(1, (int) config('ai.connect_timeout')))
                ->timeout(max(1, (int) config('ai.report_timeout')))
                ->post("{$url}/v1/reports/analyze", $payload)
                ->throw();
        } catch (ConnectionException|RequestException $exception) {
            throw new ReportAnalysisException(
                'ai_unavailable',
                'The spending report service is temporarily unavailable.',
                $exception
            );
        }

        $data = $response->json();

        if (! is_array($data)) {
            throw $this->invalidResponse();
        }

        $validator = Validator::make($data, [
            'provider' => ['required', 'string', 'max:100'],
            'period' => ['required', 'date_format:Y-m'],
            'summary' => ['required', 'string', 'max:1000'],
            'highlights' => ['present', 'array', 'max:8'],
            'highlights.*.type' => [
                'required',
                'in:top_category,budget,month_over_month,subscription',
            ],
            'highlights.*.title' => ['required', 'string', 'max:200'],
            'highlights.*.description' => ['required', 'string', 'max:1000'],
            'highlights.*.severity' => ['required', 'in:info,warning,positive'],
            'recommendations' => ['present', 'array', 'max:8'],
            'recommendations.*' => ['required', 'string', 'max:500'],
        ]);

        if ($validator->fails()) {
            throw $this->invalidResponse();
        }

        $validated = $validator->validated();
        if ($validated['period'] !== $payload['period']) {
            throw $this->invalidResponse();
        }

        return $validated;
    }

    private function invalidResponse(): ReportAnalysisException
    {
        return new ReportAnalysisException(
            'invalid_ai_response',
            'The spending report service returned an invalid response.'
        );
    }
}
