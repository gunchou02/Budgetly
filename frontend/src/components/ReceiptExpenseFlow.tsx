'use client';

import {
  Camera,
  CheckCircle2,
  CircleAlert,
  FileImage,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  Trash2,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
} from 'react';
import { upload } from '@vercel/blob/client';
import { apiClient, getApiErrorMessage } from '../api/client';
import { useAuth } from '@/auth/AuthContext';
import AmountInput from './AmountInput';
import type {
  ApiEnvelope,
  Category,
  Receipt,
  ReceiptConfirmationPayload,
  ReceiptStatus,
} from '@/types/api';
import type { FormFieldEvent } from '@/types/forms';

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const POLL_INTERVAL_MS = 1500;
const RECEIPT_UPLOAD_MODE =
  process.env.NEXT_PUBLIC_RECEIPT_UPLOAD_MODE ?? 'blob';

const failureMessages: Record<string, string> = {
  queue_unavailable: '解析処理を開始できませんでした。',
  ai_unavailable: 'AIサービスに接続できませんでした。',
  ai_request_failed: 'この画像を解析できませんでした。',
  receipt_image_missing: 'アップロードした画像を確認できませんでした。',
  analysis_failed: 'レシート解析に失敗しました。',
};

interface ReceiptReviewForm {
  category_id: number | string;
  title: string;
  amount: number | string;
  spent_at: string;
  memo: string;
}

interface ReceiptExpenseFlowProps {
  categories: Category[];
  selectedDate: string;
  onConfirmed: (spentAt: string) => Promise<void>;
}

function isPending(status: ReceiptStatus) {
  return status === 'queued' || status === 'processing';
}

function getReceiptTitle(filename: string) {
  return filename.replace(/\.[^.]+$/, '').slice(0, 100) || 'レシート';
}

function ReceiptExpenseFlow({ categories, selectedDate, onConfirmed }: ReceiptExpenseFlowProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedReceiptId = useRef<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [reviewForm, setReviewForm] = useState<ReceiptReviewForm>({
    category_id: categories[0]?.id ?? '',
    title: '',
    amount: '',
    spent_at: selectedDate,
    memo: '',
  });
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const receiptId = receipt?.id ?? null;
  const receiptStatus = receipt?.status ?? null;

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedFile]);

  useEffect(() => {
    if (!receiptId || !receiptStatus || !isPending(receiptStatus)) {
      return;
    }

    let isActive = true;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    async function pollReceipt() {
      try {
        const response = await apiClient.get<ApiEnvelope<Receipt>>(`/receipts/${receiptId}`);

        if (!isActive) {
          return;
        }

        const nextReceipt = response.data.data;
        setReceipt(nextReceipt);
        setError('');

        if (isPending(nextReceipt.status)) {
          timerId = setTimeout(pollReceipt, POLL_INTERVAL_MS);
        }
      } catch {
        if (isActive) {
          setError('解析状況を確認できませんでした。自動で再確認します。');
          timerId = setTimeout(pollReceipt, POLL_INTERVAL_MS * 2);
        }
      }
    }

    timerId = setTimeout(pollReceipt, POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [receiptId, receiptStatus]);

  useEffect(() => {
    const analysis = receipt?.analysis;

    if (
      receipt?.status !== 'review_required' ||
      !analysis ||
      initializedReceiptId.current === receipt.id ||
      categories.length === 0
    ) {
      return;
    }

    const suggestedCategoryId = categories.some(
      (category) => category.id === analysis.suggested_category_id,
    )
      ? analysis.suggested_category_id
      : categories[0].id;

    setReviewForm({
      category_id: suggestedCategoryId ?? categories[0].id,
      title: analysis.merchant?.trim() || getReceiptTitle(receipt.original_name),
      amount: analysis.amount ?? '',
      spent_at: analysis.spent_at ?? selectedDate,
      memo: '',
    });
    initializedReceiptId.current = receipt.id;
  }, [categories, receipt, selectedDate]);

  function resetFlow() {
    setSelectedFile(null);
    setReceipt(null);
    setError('');
    setReviewForm({
      category_id: categories[0]?.id ?? '',
      title: '',
      amount: '',
      spent_at: selectedDate,
      memo: '',
    });
    initializedReceiptId.current = null;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function applySelectedFile(file: File | null) {
    setError('');

    if (!file) {
      setSelectedFile(null);
      return false;
    }

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError('JPEG、PNG、WebP画像を選択してください。');
      setSelectedFile(null);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('画像サイズは5MB以下にしてください。');
      setSelectedFile(null);
      return false;
    }

    setSelectedFile(file);
    return true;
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!applySelectedFile(file)) {
      event.target.value = '';
    }
  }

  function pasteImage(event: ClipboardEvent<HTMLLabelElement>) {
    const image = Array.from(event.clipboardData.files).find((file) =>
      ACCEPTED_IMAGE_TYPES.has(file.type),
    );

    if (!image) {
      return;
    }

    event.preventDefault();
    applySelectedFile(image);
  }

  async function uploadReceipt() {
    if (!selectedFile || !user) {
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      let response;

      if (RECEIPT_UPLOAD_MODE === 'blob') {
        const jobId = crypto.randomUUID();
        const extension =
          selectedFile.type === 'image/jpeg'
            ? 'jpg'
            : selectedFile.type === 'image/png'
              ? 'png'
              : 'webp';
        const pathname = `receipts/${user.id}/${jobId}.${extension}`;
        const blob = await upload(pathname, selectedFile, {
          access: 'private',
          handleUploadUrl: '/api/receipts/blob-upload',
          clientPayload: JSON.stringify({ job_id: jobId }),
          abortSignal: AbortSignal.timeout(60_000),
        });

        response = await apiClient.post<ApiEnvelope<Receipt>>(
          '/receipts/blob',
          {
            job_id: jobId,
            pathname: blob.pathname,
            original_name: selectedFile.name,
          },
          { timeout: 30000 },
        );
      } else {
        const formData = new FormData();
        formData.append('image', selectedFile);
        response = await apiClient.post<ApiEnvelope<Receipt>>(
          '/receipts',
          formData,
          { timeout: 30000 },
        );
      }

      setReceipt(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsUploading(false);
    }
  }

  async function refreshReceipt() {
    if (!receipt) {
      return;
    }

    setError('');
    setIsRefreshing(true);

    try {
      const response = await apiClient.get<ApiEnvelope<Receipt>>(`/receipts/${receipt.id}`);
      setReceipt(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function retryReceipt() {
    if (!receipt) {
      return;
    }

    setError('');
    setIsRetrying(true);
    initializedReceiptId.current = null;

    try {
      const response = await apiClient.post<ApiEnvelope<Receipt>>(`/receipts/${receipt.id}/retry`);
      setReceipt(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsRetrying(false);
    }
  }

  async function deleteReceipt() {
    if (!receipt || !window.confirm('このレシート画像を削除しますか？')) {
      return;
    }

    setError('');
    setIsDeleting(true);

    try {
      await apiClient.delete(`/receipts/${receipt.id}`);
      resetFlow();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsDeleting(false);
    }
  }

  function updateReviewForm(event: FormFieldEvent) {
    setReviewForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }));
  }

  async function confirmReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!receipt) {
      return;
    }

    const payload: ReceiptConfirmationPayload = {
      category_id: Number(reviewForm.category_id),
      title: reviewForm.title.trim(),
      amount: Number(reviewForm.amount),
      spent_at: reviewForm.spent_at,
      memo: reviewForm.memo.trim(),
    };

    setError('');
    setIsConfirming(true);

    try {
      const response = await apiClient.post<ApiEnvelope<Receipt>>(
        `/receipts/${receipt.id}/confirm`,
        payload,
      );
      setReceipt(response.data.data);
      await onConfirmed(payload.spent_at);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsConfirming(false);
    }
  }

  const analysis = receipt?.analysis;
  const overallConfidence = analysis ? Math.round(analysis.confidence.overall * 100) : null;

  return (
    <div className="receipt-flow">
      {error && <p className="form-error">{error}</p>}

      {!receipt && (
        <>
          <label
            className="receipt-file-picker"
            data-testid="receipt-file-picker"
            tabIndex={0}
            onPaste={pasteImage}
          >
            <Camera size={24} aria-hidden="true" />
            <span>{selectedFile ? '別の画像を選択' : '撮影・画像を選択'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={selectFile}
            />
          </label>

          {selectedFile && (
            <div className="receipt-file-preview">
              {/* Blob URLs are local previews and cannot use Next image optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {previewUrl && <img src={previewUrl} alt="選択したレシート" />}
              <div className="receipt-file-meta">
                <FileImage size={18} aria-hidden="true" />
                <span>{selectedFile.name}</span>
                <small>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</small>
              </div>
            </div>
          )}

          <button
            className="primary-button"
            type="button"
            onClick={uploadReceipt}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <ScanLine size={18} aria-hidden="true" />}
            {isUploading ? 'アップロード中...' : 'レシートを解析'}
          </button>
        </>
      )}

      {receipt && isPending(receipt.status) && (
        <div className="receipt-state-view">
          {/* Blob URLs are local previews and cannot use Next image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {previewUrl && <img className="receipt-state-preview" src={previewUrl} alt="解析中のレシート" />}
          <div className="receipt-processing">
            <LoaderCircle className="spin" size={22} aria-hidden="true" />
            <div>
              <strong>{receipt.status === 'queued' ? '解析待ち' : 'レシートを解析中'}</strong>
              <span>{receipt.original_name}</span>
            </div>
          </div>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={refreshReceipt} disabled={isRefreshing}>
              <RefreshCw size={17} aria-hidden="true" />
              状態を更新
            </button>
            <button className="danger-button" type="button" onClick={deleteReceipt} disabled={isDeleting}>
              <Trash2 size={17} aria-hidden="true" />
              キャンセル
            </button>
          </div>
        </div>
      )}

      {receipt?.status === 'failed' && (
        <div className="receipt-state-view">
          <div className="receipt-failure">
            <CircleAlert size={22} aria-hidden="true" />
            <div>
              <strong>解析できませんでした</strong>
              <span>{failureMessages[receipt.failure_code ?? ''] ?? '時間をおいて再試行してください。'}</span>
            </div>
          </div>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={retryReceipt} disabled={isRetrying}>
              <RefreshCw size={17} aria-hidden="true" />
              {isRetrying ? '再試行中...' : '再試行'}
            </button>
            <button className="danger-button" type="button" onClick={deleteReceipt} disabled={isDeleting}>
              <Trash2 size={17} aria-hidden="true" />
              削除
            </button>
          </div>
        </div>
      )}

      {receipt?.status === 'review_required' && analysis && (
        <form className="form-grid compact-form receipt-review-form" onSubmit={confirmReceipt}>
          <div className="receipt-review-heading">
            <div>
              <strong>読み取り結果</strong>
              <span>内容を確認してから追加してください</span>
            </div>
            {overallConfidence !== null && (
              <span className={`receipt-confidence${overallConfidence < 75 ? ' low' : ''}`}>
                精度 {overallConfidence}%
              </span>
            )}
          </div>
          <label>
            カテゴリ
            <select name="category_id" value={reviewForm.category_id} onChange={updateReviewForm} required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            タイトル
            <input name="title" maxLength={100} value={reviewForm.title} onChange={updateReviewForm} required />
          </label>
          <label>
            日付
            <input name="spent_at" type="date" value={reviewForm.spent_at} onChange={updateReviewForm} required />
          </label>
          <label>
            金額
            <AmountInput name="amount" value={reviewForm.amount} onChange={updateReviewForm} required />
          </label>
          <label>
            メモ
            <input name="memo" maxLength={1000} value={reviewForm.memo} onChange={updateReviewForm} />
          </label>
          {analysis.extracted_text && (
            <details className="receipt-ocr-details">
              <summary>読み取りテキスト</summary>
              <pre>{analysis.extracted_text}</pre>
            </details>
          )}
          <div className="button-row">
            <button className="primary-button" type="submit" disabled={isConfirming || categories.length === 0}>
              <CheckCircle2 size={18} aria-hidden="true" />
              {isConfirming ? '追加中...' : '支出として追加'}
            </button>
            <button className="danger-button" type="button" onClick={deleteReceipt} disabled={isDeleting}>
              <Trash2 size={17} aria-hidden="true" />
              破棄
            </button>
          </div>
        </form>
      )}

      {receipt?.status === 'confirmed' && (
        <div className="receipt-confirmed">
          <CheckCircle2 size={28} aria-hidden="true" />
          <strong>支出に追加しました</strong>
          {receipt.expense && (
            <span>
              {receipt.expense.title} / ¥{Number(receipt.expense.amount).toLocaleString('ja-JP')}
            </span>
          )}
          <button className="secondary-button" type="button" onClick={resetFlow}>
            次のレシート
          </button>
        </div>
      )}
    </div>
  );
}

export default ReceiptExpenseFlow;
