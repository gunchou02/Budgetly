<?php

namespace App\Services;

use App\Models\User;

class DefaultCategoryService
{
    public function createForUser(User $user): void
    {
        foreach (config('budgetly.default_categories') as $index => $category) {
            $user->categories()->updateOrCreate(
                ['name' => $category['name']],
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
