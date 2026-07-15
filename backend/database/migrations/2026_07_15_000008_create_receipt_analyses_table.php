<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipt_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receipt_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('suggested_category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('provider', 50);
            $table->string('merchant')->nullable();
            $table->date('spent_at')->nullable();
            $table->unsignedInteger('amount')->nullable();
            $table->json('confidence');
            $table->text('extracted_text')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipt_analyses');
    }
};
