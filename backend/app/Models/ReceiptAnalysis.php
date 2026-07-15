<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReceiptAnalysis extends Model
{
    use HasFactory;

    protected $fillable = [
        'receipt_id',
        'suggested_category_id',
        'provider',
        'merchant',
        'spent_at',
        'amount',
        'confidence',
        'extracted_text',
    ];

    protected $casts = [
        'spent_at' => 'date:Y-m-d',
        'confidence' => 'array',
    ];

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(Receipt::class);
    }

    public function suggestedCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'suggested_category_id');
    }
}
