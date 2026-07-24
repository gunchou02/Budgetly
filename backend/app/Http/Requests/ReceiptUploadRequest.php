<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\Validator;

class ReceiptUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $mimeTypes = implode(',', config('budgetly.receipts.allowed_mime_types'));
        $extensions = implode(',', config('budgetly.receipts.allowed_extensions'));

        return [
            'image' => [
                'bail',
                'required',
                File::image()->max((int) config('budgetly.receipts.max_upload_kb')),
                "mimetypes:{$mimeTypes}",
                "extensions:{$extensions}",
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'レシート画像を選択してください。',
            'image.uploaded' => '画像をアップロードできませんでした。5MB以下の画像を選択してください。',
            'image.image' => 'JPEG、PNG、WebP画像を選択してください。',
            'image.max' => '画像サイズは5MB以下にしてください。',
            'image.mimetypes' => 'JPEG、PNG、WebP画像を選択してください。',
            'image.extensions' => 'JPEG、PNG、WebP画像を選択してください。',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('image')) {
                    return;
                }

                $image = $this->file('image');

                if (! $image instanceof UploadedFile) {
                    return;
                }

                $dimensions = $image->dimensions();

                if (! is_array($dimensions) || ! isset($dimensions[0], $dimensions[1])) {
                    $validator->errors()->add('image', '画像のサイズを確認できません。');

                    return;
                }

                $pixels = (int) $dimensions[0] * (int) $dimensions[1];

                if ($pixels > (int) config('budgetly.receipts.max_pixels')) {
                    $validator->errors()->add('image', '画像の解像度が大きすぎます。');
                }
            },
        ];
    }
}
