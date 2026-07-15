<?php

namespace App\Exceptions;

use RuntimeException;

class ReceiptAnalysisException extends RuntimeException
{
    public function __construct(
        public readonly string $failureCode,
        string $message
    ) {
        parent::__construct($message);
    }
}
