<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MonthlyBudgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => [
                'required',
                'integer',
                'between:2000,2100',
                Rule::unique('monthly_budgets', 'year')
                    ->where('user_id', $this->user()->id)
                    ->where('month', $this->integer('month'))
                    ->ignore($this->route('budget')),
            ],
            'month' => ['required', 'integer', 'between:1,12'],
            'amount' => ['required', 'integer', 'min:0'],
        ];
    }
}
