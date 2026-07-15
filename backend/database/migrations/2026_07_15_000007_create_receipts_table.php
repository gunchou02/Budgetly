<?php

use App\Enums\ReceiptStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('expense_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->uuid('job_id')->unique();
            $table->string('status', 30)->default(ReceiptStatus::Queued->value);
            $table->string('storage_disk', 50);
            $table->string('image_path', 500);
            $table->string('original_name');
            $table->string('mime_type', 50);
            $table->unsignedBigInteger('file_size');
            $table->string('failure_code', 100)->nullable();
            $table->string('failure_message', 500)->nullable();
            $table->timestamp('processing_started_at')->nullable();
            $table->timestamp('analyzed_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipts');
    }
};
