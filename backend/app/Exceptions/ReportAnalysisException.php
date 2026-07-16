<?php

namespace App\Exceptions;

use RuntimeException;
use Throwable;

class ReportAnalysisException extends RuntimeException
{
    public function __construct(
        public readonly string $failureCode,
        string $message,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, 0, $previous);
    }
}
