import { PenLine, ReceiptText } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { getDateValue } from '../utils/formatters';
import AmountInput from './AmountInput';
import ReceiptExpenseFlow from './ReceiptExpenseFlow';
import type { Category, Expense, ExpensePayload, SubscriptionPayload } from '@/types/api';
import type { FormFieldEvent } from '@/types/forms';

interface QuickExpenseForm {
  category_id: number | string;
  title: string;
  amount: number | string;
  spent_at: string;
  is_recurring: boolean;
  memo: string;
}

interface QuickExpensePanelProps {
  categories: Category[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onCreate: (payload: ExpensePayload) => Promise<void>;
  onCreateRecurring: (payload: SubscriptionPayload) => Promise<void>;
  onUpdate: (expenseId: number, payload: ExpensePayload) => Promise<void>;
  onReceiptConfirmed: (spentAt: string) => Promise<void>;
  editingExpense: Expense | null;
  onClearEditing?: () => void;
}

function QuickExpensePanel({
  categories,
  selectedDate,
  onSelectDate,
  onCreate,
  onCreateRecurring,
  onUpdate,
  onReceiptConfirmed,
  editingExpense,
  onClearEditing = () => {},
}: QuickExpensePanelProps) {
  const defaultCategoryId = categories[0]?.id ?? '';
  const [entryMode, setEntryMode] = useState<'manual' | 'receipt'>('manual');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<QuickExpenseForm>({
    category_id: defaultCategoryId,
    title: '',
    amount: '',
    spent_at: selectedDate,
    is_recurring: false,
    memo: '',
  });

  useEffect(() => {
    setEditingId(null);
    setForm({
      category_id: defaultCategoryId,
      title: '',
      amount: '',
      spent_at: selectedDate,
      is_recurring: false,
      memo: '',
    });
  }, [defaultCategoryId, selectedDate]);

  useEffect(() => {
    if (!editingExpense) {
      return;
    }

    setEditingId(editingExpense.id);
    setEntryMode('manual');
    setForm({
      category_id: editingExpense.category_id,
      title: editingExpense.title,
      amount: editingExpense.amount,
      spent_at: getDateValue(editingExpense.spent_at),
      is_recurring: false,
      memo: editingExpense.memo ?? '',
    });
  }, [editingExpense]);

  function updateForm(event: FormFieldEvent) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));
  }

  function resetForm() {
    setEditingId(null);
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

    const payload = {
      category_id: Number(form.category_id),
      title: form.title.trim(),
      amount: Number(form.amount),
      spent_at: form.spent_at,
      memo: form.memo.trim(),
    };

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

    onSelectDate(payload.spent_at);
    onClearEditing();
    resetForm();
  }

  return (
    <section className="panel quick-expense-panel">
      <div className="panel-header">
        <div>
          <h2>{editingId ? '支出を編集' : entryMode === 'receipt' ? 'レシートから追加' : '支出を追加'}</h2>
          <p className="muted-text">{selectedDate}</p>
        </div>
      </div>

      {!editingId && (
        <div className="entry-mode-control" role="tablist" aria-label="支出の入力方法">
          <button
            type="button"
            role="tab"
            aria-selected={entryMode === 'manual'}
            className={entryMode === 'manual' ? 'active' : ''}
            onClick={() => setEntryMode('manual')}
          >
            <PenLine size={17} aria-hidden="true" />
            手入力
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={entryMode === 'receipt'}
            className={entryMode === 'receipt' ? 'active' : ''}
            onClick={() => setEntryMode('receipt')}
          >
            <ReceiptText size={17} aria-hidden="true" />
            レシート
          </button>
        </div>
      )}

      {(entryMode === 'manual' || editingId) && (
        <form className="form-grid compact-form" onSubmit={handleSubmit}>
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
            タイトル
            <input name="title" value={form.title} onChange={updateForm} required />
          </label>
          <label>
            日付
            <input name="spent_at" type="date" value={form.spent_at} onChange={updateForm} required />
          </label>
          <label>
            金額
            <AmountInput name="amount" value={form.amount} onChange={updateForm} required />
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
          <div className="button-row">
            <button className="primary-button" type="submit" disabled={!defaultCategoryId}>
              {editingId ? '更新' : form.is_recurring ? '固定費として追加' : '追加'}
            </button>
            {editingId && (
              <button className="secondary-button" type="button" onClick={resetForm}>
                キャンセル
              </button>
            )}
          </div>
        </form>
      )}

      <div className={entryMode === 'receipt' && !editingId ? '' : 'is-hidden'}>
        <ReceiptExpenseFlow
          categories={categories}
          selectedDate={selectedDate}
          onConfirmed={onReceiptConfirmed}
        />
      </div>
    </section>
  );
}

export default QuickExpensePanel;
