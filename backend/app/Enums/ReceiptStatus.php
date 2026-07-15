<?php

namespace App\Enums;

enum ReceiptStatus: string
{
    case Queued = 'queued';
    case Processing = 'processing';
    case ReviewRequired = 'review_required';
    case Confirmed = 'confirmed';
    case Failed = 'failed';
}
