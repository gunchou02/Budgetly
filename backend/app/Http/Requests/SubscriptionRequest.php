<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')->where('user_id', $this->user()->id),
            ],
            'name' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'integer', 'min:1'],
            'billing_cycle' => ['nullable', Rule::in(['monthly'])],
            'billing_day' => ['required', 'integer', 'between:1,31'],
            'started_at' => ['required', 'date'],
            'canceled_at' => ['nullable', 'date', 'after_or_equal:started_at'],
            'memo' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
