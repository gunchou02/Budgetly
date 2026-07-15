<?php

namespace App\Services;

use App\Enums\ReceiptStatus;
use App\Models\Receipt;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ReceiptStorageService
{
    public function store(User $user, UploadedFile $image): Receipt
    {
        $jobId = (string) Str::uuid();
        $disk = (string) config('budgetly.receipts.disk');
        $mimeType = (string) $image->getMimeType();
        $extension = $this->extensionFor($mimeType);
        $imagePath = "receipts/{$user->id}/{$jobId}.{$extension}";
        $fileSize = $image->getSize();

        if (! is_int($fileSize)) {
            throw new RuntimeException('Unable to determine the receipt file size.');
        }

        $storedPath = Storage::disk($disk)->putFileAs(
            "receipts/{$user->id}",
            $image,
            "{$jobId}.{$extension}"
        );

        if ($storedPath !== $imagePath) {
            if (is_string($storedPath)) {
                Storage::disk($disk)->delete($storedPath);
            }

            throw new RuntimeException('Unable to store the receipt image.');
        }

        try {
            return $user->receipts()->create([
                'job_id' => $jobId,
                'status' => ReceiptStatus::Queued,
                'storage_disk' => $disk,
                'image_path' => $imagePath,
                'original_name' => $this->sanitizeOriginalName($image, $extension),
                'mime_type' => $mimeType,
                'file_size' => $fileSize,
            ]);
        } catch (Throwable $exception) {
            Storage::disk($disk)->delete($imagePath);

            throw $exception;
        }
    }

    public function delete(Receipt $receipt): void
    {
        $storage = Storage::disk($receipt->storage_disk);

        if ($storage->exists($receipt->image_path) && ! $storage->delete($receipt->image_path)) {
            throw new RuntimeException('Unable to delete the receipt image.');
        }

        $receipt->delete();
    }

    private function extensionFor(string $mimeType): string
    {
        return match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => throw new RuntimeException('Unsupported receipt image type.'),
        };
    }

    private function sanitizeOriginalName(UploadedFile $image, string $extension): string
    {
        $name = basename(str_replace('\\', '/', $image->getClientOriginalName()));
        $name = trim(preg_replace('/[[:cntrl:]]/u', '', $name) ?? '');

        if ($name === '') {
            $name = "receipt.{$extension}";
        }

        return Str::limit($name, 255, '');
    }
}
