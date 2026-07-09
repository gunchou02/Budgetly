<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('type', 20)->default('expense')->after('icon');
        });

        DB::table('categories')
            ->whereIn('name', ['サブスク', '家賃・住居', '保険', 'ローン・分割'])
            ->update(['type' => 'fixed']);
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
