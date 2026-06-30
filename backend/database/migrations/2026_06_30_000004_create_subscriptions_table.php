<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('name', 100);
            $table->unsignedInteger('amount');
            $table->string('billing_cycle', 20)->default('monthly');
            $table->unsignedTinyInteger('billing_day');
            $table->date('started_at');
            $table->date('canceled_at')->nullable();
            $table->text('memo')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'canceled_at']);
            $table->index(['user_id', 'billing_day']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
