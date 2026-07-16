<?php

namespace App\Services;

use App\Exceptions\ReceiptAnalysisException;
use App\Models\Receipt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ReceiptAiClient
{
    public function analyze(Receipt $receipt): array
    {
        $url = rtrim((string) config('ai.url'), '/');
        $token = (string) config('ai.token');

        if (filter_var($url, FILTER_VALIDATE_URL) === false || $token === '') {
            throw new ReceiptAnalysisException(
                'ai_configuration_error',
                'The receipt analysis service is not configured.'
            );
        }

        $categories = $receipt->user
            ->categories()
            ->where('type', 'expense')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->limit(100)
            ->get(['id', 'name']);

        if ($categories->isEmpty()) {
            throw new ReceiptAnalysisException(
                'category_candidates_missing',
                'No expense categories are available for receipt analysis.'
            );
        }

        $payload = json_encode([
            'job_id' => $receipt->job_id,
            'image_key' => $receipt->image_path,
            'mime_type' => $receipt->mime_type,
            'language' => 'ja',
            'category_candidates' => $categories
                ->map(fn ($category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                ])
                ->values()
                ->all(),
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);

        $imageStream = Storage::disk($receipt->storage_disk)->readStream($receipt->image_path);

        if ($imageStream === false) {
            throw new ReceiptAnalysisException(
                'receipt_image_missing',
                'The receipt image is no longer available.'
            );
        }

        try {
            $response = Http::acceptJson()
                ->withHeaders([
                    'X-Internal-Token' => $token,
                    'X-Request-ID' => $receipt->job_id,
                ])
                ->connectTimeout(max(1, (int) config('ai.connect_timeout')))
                ->timeout(max(1, (int) config('ai.timeout')))
                ->attach(
                    'image',
                    $imageStream,
                    $receipt->original_name,
                    ['Content-Type' => $receipt->mime_type]
                )
                ->post("{$url}/v1/receipts/analyze", [
                    'payload' => $payload,
                ])
                ->throw();
        } finally {
            if (is_resource($imageStream)) {
                fclose($imageStream);
            }
        }

        $data = $response->json();

        if (! is_array($data)) {
            throw $this->invalidResponse();
        }

        $validator = Validator::make($data, [
            'provider' => ['required', 'string', 'max:50'],
            'merchant' => ['present', 'nullable', 'string', 'max:255'],
            'spent_at' => ['present', 'nullable', 'date_format:Y-m-d'],
            'amount' => ['present', 'nullable', 'integer', 'min:1', 'max:4294967295'],
            'suggested_category_id' => ['present', 'nullable', 'integer'],
            'confidence' => ['required', 'array'],
            'confidence.merchant' => ['required', 'numeric', 'between:0,1'],
            'confidence.spent_at' => ['required', 'numeric', 'between:0,1'],
            'confidence.amount' => ['required', 'numeric', 'between:0,1'],
            'confidence.category' => ['required', 'numeric', 'between:0,1'],
            'confidence.overall' => ['required', 'numeric', 'between:0,1'],
            'extracted_text' => [
                'required',
                'string',
                'max:'.max(1, (int) config('ai.max_extracted_text_length')),
            ],
        ]);

        if ($validator->fails()) {
            throw $this->invalidResponse();
        }

        $validated = $validator->validated();
        $categoryId = $validated['suggested_category_id'];
        $categoryIds = $categories->pluck('id')->map(fn ($id) => (int) $id)->all();

        if ($categoryId !== null && ! in_array($categoryId, $categoryIds, true)) {
            throw $this->invalidResponse();
        }

        return $validated;
    }

    private function invalidResponse(): ReceiptAnalysisException
    {
        return new ReceiptAnalysisException(
            'invalid_ai_response',
            'The receipt analysis service returned an invalid response.'
        );
    }
}
