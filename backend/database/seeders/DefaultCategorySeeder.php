<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class DefaultCategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach (config('budgetly.default_categories') as $index => $category) {
            Category::updateOrCreate(
                [
                    'user_id' => null,
                    'name' => $category['name'],
                ],
                [
                    'color' => $category['color'],
                    'icon' => $category['icon'],
                    'type' => $category['type'] ?? 'expense',
                    'sort_order' => $index + 1,
                    'is_default' => true,
                ]
            );
        }
    }
}
