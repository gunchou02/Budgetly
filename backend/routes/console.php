<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('budgetly:about', function () {
    $this->info('Budgetly API');
})->purpose('Show Budgetly project information');
