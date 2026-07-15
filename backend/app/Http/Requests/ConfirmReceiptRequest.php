<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConfirmReceiptRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'integer', 'min:1'],
            'spent_at' => ['required', 'date'],
            'memo' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
