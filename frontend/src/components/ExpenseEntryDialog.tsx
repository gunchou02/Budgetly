import dynamic from 'next/dynamic';
import { PenLine, ReceiptText, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { getApiErrorMessage } from '../api/client';
import { getDateValue } from '../utils/formatters';
import AmountInput from './AmountInput';
import type { Category, Expense, ExpensePayload, SubscriptionPayload } from '@/types/api';
import type { FormFieldEvent } from '@/types/forms';

const ReceiptExpenseFlow = dynamic(() => import('./ReceiptExpenseFlow'));

interface ExpenseForm {
  category_id: number | string;
  title: string;
  amount: number | string;
  spent_at: string;
  is_recurring: boolean;
  memo: string;
}

interface ExpenseEntryDialogProps {
  isOpen: boolean;
  categories: Category[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onCreate: (payload: ExpensePayload) => Promise<void>;
  onCreateRecurring: (payload: SubscriptionPayload) => Promise<void>;
  onUpdate: (expenseId: number, payload: ExpensePayload) => Promise<void>;
  onReceiptConfirmed: (spentAt: string) => Promise<void>;
  editingExpense: Expense | null;
  onClearEditing?: () => void;
  onClose: () => void;
}

function ExpenseEntryDialog({
  isOpen,
  categories,
  selectedDate,
  onSelectDate,
  onCreate,
  onCreateRecurring,
  onUpdate,
  onReceiptConfirmed,
  editingExpense,
  onClearEditing = () => {},
  onClose,
}: ExpenseEntryDialogProps) {
  const { user } = useAuth();
  const isGuest = user?.is_guest ?? false;
  const defaultCategoryId = categories[0]?.id ?? '';
  const [entryMode, setEntryMode] = useState<'manual' | 'receipt'>('manual');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ExpenseForm>({
    category_id: defaultCategoryId,
    title: '',
    amount: '',
    spent_at: selectedDate,
    is_recurring: false,
    memo: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setEditingId(editingExpense?.id ?? null);
    if (editingExpense) setEntryMode('manual');
    setForm({
      category_id: editingExpense?.category_id ?? defaultCategoryId,
      title: editingExpense?.title ?? '',
      amount: editingExpense?.amount ?? '',
      spent_at: editingExpense ? getDateValue(editingExpense.spent_at) : selectedDate,
      is_recurring: false,
      memo: editingExpense?.memo ?? '',
    });
  }, [defaultCategoryId, selectedDate, editingExpense, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setSubmitError('');
    setSubmitSuccess('');
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true });
      } else {
        document.querySelector<HTMLElement>('#main-content')?.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (entryMode === 'receipt' && !editingId) return;
    const frameId = requestAnimationFrame(() => amountInputRef.current?.focus());
    return () => cancelAnimationFrame(frameId);
  }, [editingId, entryMode, isOpen]);

  function updateForm(event: FormFieldEvent) {
    setSubmitSuccess('');
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setSubmitError('');
    setSubmitSuccess('');
    onClearEditing();
    setForm({
      category_id: defaultCategoryId,
      title: '',
      amount: '',
      spent_at: selectedDate,
      is_recurring: false,
      memo: '',
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmitError('');
    setSubmitSuccess('');

    const payload = {
      category_id: Number(form.category_id),
      title: form.title.trim(),
      amount: Number(form.amount),
      spent_at: form.spent_at,
      memo: form.memo.trim(),
    };

    setIsSubmitting(true);

    try {
      if (editingId) {
        await onUpdate(editingId, payload);
      } else if (form.is_recurring) {
        const [, , billingDay] = form.spent_at.split('-').map(Number);

        await onCreateRecurring({
          category_id: payload.category_id,
          name: payload.title,
          amount: payload.amount,
          billing_day: billingDay,
          started_at: payload.spent_at,
          memo: payload.memo,
          billing_cycle: 'monthly',
        });
      } else {
        await onCreate(payload);
      }

      const successMessage = editingId
        ? '支出を更新しました。'
        : form.is_recurring
          ? '固定費を追加しました。'
          : '支出を追加しました。';

      onSelectDate(payload.spent_at);
      resetForm();
      setSubmitSuccess(successMessage);
    } catch (requestError) {
      setSubmitError(getApiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="expense-entry-dialog"
      aria-labelledby="expense-entry-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) onClose();
      }}
    >
      <button type="button" className="expense-dialog-close" onClick={onClose} disabled={isSubmitting} aria-label="入力を閉じる">
        <X size={21} aria-hidden="true" />
      </button>
      <div id="expense-entry-content">
        <div className="panel-header">
          <div>
            <h2 id="expense-entry-title">{editingId ? '支出を編集' : entryMode === 'receipt' ? 'レシートから追加' : '支出を追加'}</h2>
            <p className="muted-text">{form.spent_at}</p>
          </div>
        </div>

        {!editingId && !isGuest && (
          <div className="entry-mode-control" role="group" aria-label="支出の入力方法">
            <button
              type="button"
              aria-pressed={entryMode === 'manual'}
              className={entryMode === 'manual' ? 'active' : ''}
              onClick={() => {
                setSubmitError('');
                setSubmitSuccess('');
                setEntryMode('manual');
              }}
            >
              <PenLine size={17} aria-hidden="true" />
              手入力
            </button>
            <button
              type="button"
              aria-pressed={entryMode === 'receipt'}
              className={entryMode === 'receipt' ? 'active' : ''}
              onClick={() => {
                setSubmitError('');
                setSubmitSuccess('');
                setEntryMode('receipt');
              }}
            >
              <ReceiptText size={17} aria-hidden="true" />
              レシート
            </button>
          </div>
        )}

        {!editingId && isGuest && (
          <p className="guest-feature-note">
            ゲストモードでは手入力を利用できます。レシート解析はアカウント利用時に使えます。
          </p>
        )}

        {(entryMode === 'manual' || editingId) && (
          <form className="form-grid compact-form" onSubmit={handleSubmit}>
            <fieldset className="form-fields" disabled={isSubmitting}>
              <legend className="sr-only">支出の入力</legend>
              <label>
                金額
                <AmountInput
                  name="amount"
                  value={form.amount}
                  onChange={updateForm}
                  required
                  inputRef={amountInputRef}
                />
              </label>
              <label>
                タイトル
                <input
                  name="title"
                  value={form.title}
                  onChange={updateForm}
                  placeholder="例: ランチ"
                  required
                />
              </label>
              <label>
                カテゴリ
                <select name="category_id" value={form.category_id} onChange={updateForm} required>
                  {!defaultCategoryId && <option value="">カテゴリなし</option>}
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                日付
                <input name="spent_at" type="date" value={form.spent_at} onChange={updateForm} required />
              </label>
              {!editingId && (
                <label className="checkbox-label">
                  <input
                    name="is_recurring"
                    type="checkbox"
                    checked={form.is_recurring}
                    onChange={updateForm}
                  />
                  毎月繰り返す
                </label>
              )}
              <label>
                メモ
                <input name="memo" value={form.memo} onChange={updateForm} />
              </label>
              {submitError && (
                <p className="form-error" role="alert">
                  {submitError}
                </p>
              )}
              {submitSuccess && (
                <p className="form-success" role="status">
                  {submitSuccess}
                </p>
              )}
              <div className="button-row">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={isSubmitting || !defaultCategoryId}
                >
                  {isSubmitting
                    ? '送信中…'
                    : editingId
                      ? '更新'
                      : form.is_recurring
                        ? '固定費として追加'
                        : '追加'}
                </button>
                {editingId && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    キャンセル
                  </button>
                )}
              </div>
            </fieldset>
          </form>
        )}

        {!isGuest && (
          <div className={entryMode === 'receipt' && !editingId ? '' : 'is-hidden'}>
            <ReceiptExpenseFlow
              categories={categories}
              selectedDate={selectedDate}
              onConfirmed={onReceiptConfirmed}
            />
          </div>
        )}
      </div>
    </dialog>
  );
}

export default ExpenseEntryDialog;
