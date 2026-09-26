import { useState } from 'react';
import {
  BookOpen, Coffee, CreditCard, Dumbbell, Gamepad2, Heart, MoreHorizontal, Package, Pencil, Plane, Plug, Sparkles, Users,
  ShoppingBag, Smartphone, TrainFront, Trash2, Utensils, WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { getApiErrorMessage } from '@/api/client';
import BrandIllustration from '@/components/BrandIllustration';
import { formatYen, getDateValue } from '@/utils/formatters';
import type { Expense } from '@/types/api';

const categoryIcons: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  train: TrainFront,
  smartphone: Smartphone,
  'shopping-bag': ShoppingBag,
  'heart-pulse': Heart,
  'book-open': BookOpen,
  'credit-card': CreditCard,
  plug: Plug,
  sparkles: Sparkles,
  dumbbell: Dumbbell,
  'gamepad-2': Gamepad2,
  users: Users,
  plane: Plane,
  package: Package,
  'more-horizontal': MoreHorizontal,
};

interface RecentExpenseListProps {
  expenses: Expense[];
  onCreate: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: number) => Promise<void>;
}

export default function RecentExpenseList({ expenses, onCreate, onEdit, onDelete }: RecentExpenseListProps) {
  const [showAll, setShowAll] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const sortedExpenses = [...expenses].sort((first, second) =>
    getDateValue(second.spent_at).localeCompare(getDateValue(first.spent_at)) || second.id - first.id,
  );
  const visibleExpenses = showAll ? sortedExpenses : sortedExpenses.slice(0, 6);

  async function removeExpense(expense: Expense) {
    if (deletingId !== null || !window.confirm(`「${expense.title}」を削除しますか？この操作は元に戻せません。`)) return;
    setDeletingId(expense.id);
    setError('');
    setMessage('');
    try {
      await onDelete(expense.id);
      setMessage('支出を削除しました。');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="panel recent-expense-panel" aria-labelledby="recent-expense-title">
      <div className="panel-header split">
        <h2 id="recent-expense-title">{showAll ? '今月の支出' : '最近の支出'}</h2>
        {expenses.length > 6 && (
          <button type="button" className="text-link text-button" onClick={() => setShowAll(!showAll)} aria-expanded={showAll} aria-controls="recent-expenses">
            {showAll ? '最近の6件に戻す' : `すべて見る (${expenses.length})`}
          </button>
        )}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="sr-only" role="status">{message}</p>}
      {expenses.length > 0 ? (
        <ul className="recent-expense-list" id="recent-expenses">
          {visibleExpenses.map((expense) => {
            const Icon = categoryIcons[expense.category?.icon ?? ''] ?? WalletCards;
            const date = getDateValue(expense.spent_at);
            const [, month, day] = date.split('-').map(Number);
            return (
              <li className="recent-expense-row" key={expense.id}>
                <span className="expense-category-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.7} /></span>
                <div className="recent-expense-description">
                  <strong>{expense.title}</strong>
                  <span>{expense.category?.name ?? 'その他'}<span aria-hidden="true"> · </span><time dateTime={date}>{month}月{day}日</time></span>
                </div>
                <strong className="recent-expense-amount">{formatYen(expense.amount)}</strong>
                <details className="expense-row-menu">
                  <summary aria-label={`${expense.title}の操作`}><MoreHorizontal size={18} aria-hidden="true" /></summary>
                  <div className="expense-row-actions">
                    <button type="button" disabled={deletingId !== null} onClick={(event) => {
                      const menu = event.currentTarget.closest('details');
                      menu?.removeAttribute('open');
                      menu?.querySelector('summary')?.focus();
                      onEdit(expense);
                    }}><Pencil size={15} aria-hidden="true" />編集</button>
                    <button type="button" className="danger-text" disabled={deletingId !== null} onClick={() => removeExpense(expense)}>
                      <Trash2 size={15} aria-hidden="true" />{deletingId === expense.id ? '削除中…' : '削除'}
                    </button>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty-state recent-expense-empty">
          <BrandIllustration kind="receipt" size={104} />
          <p>まだ記録はありません。<br />今日の小さな支出から、はじめてみましょう。</p>
          <button type="button" className="secondary-button" onClick={onCreate}>最初の支出を記録</button>
        </div>
      )}
    </section>
  );
}
