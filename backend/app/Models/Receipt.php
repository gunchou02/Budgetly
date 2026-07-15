<?php

namespace App\Models;

use App\Enums\ReceiptStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Receipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'expense_id',
        'job_id',
        'status',
        'storage_disk',
        'image_path',
        'original_name',
        'mime_type',
        'file_size',
        'failure_code',
        'failure_message',
        'processing_started_at',
        'analyzed_at',
        'confirmed_at',
    ];

    protected $hidden = [
        'storage_disk',
        'image_path',
    ];

    protected $casts = [
        'status' => ReceiptStatus::class,
        'processing_started_at' => 'datetime',
        'analyzed_at' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }

    public function analysis(): HasOne
    {
        return $this->hasOne(ReceiptAnalysis::class);
    }
}
