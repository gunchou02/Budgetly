'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import AmountInput from '../components/AmountInput';
import { formatMonthLabel, formatYen, getCurrentYearMonth } from '../utils/formatters';
import type { ApiEnvelope, MonthlyBudget } from '@/types/api';
import type { FormFieldEvent } from '@/types/forms';

interface BudgetForm {
  year: number;
  month: number;
  amount: number | string;
}

function BudgetsPage() {
  const current = getCurrentYearMonth();
  const [form, setForm] = useState<BudgetForm>({
    year: current.year,
    month: current.month,
    amount: '',
  });
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const displayedAmount = budget?.amount ?? form.amount;

  useEffect(() => {
    let isActive = true;

    async function fetchBudget() {
      setError('');
      setMessage('');

      try {
        const response = await apiClient.get<ApiEnvelope<MonthlyBudget | null>>('/budgets', {
          params: {
            year: form.year,
            month: form.month,
          },
        });

        if (isActive) {
          setBudget(response.data.data);
          setForm((currentForm) => ({
            ...currentForm,
            amount: response.data.data?.amount ?? '',
          }));
        }
      } catch (requestError) {
        if (isActive) {
          setError(getApiErrorMessage(requestError));
        }
      }
    }

    fetchBudget();

    return () => {
      isActive = false;
    };
  }, [form.year, form.month]);

  function updateField(event: FormFieldEvent) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.name === 'amount' ? event.target.value : Number(event.target.value),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const payload = {
        year: form.year,
        month: form.month,
        amount: form.amount,
      };
      const response = budget
        ? await apiClient.put<ApiEnvelope<MonthlyBudget>>(`/budgets/${budget.id}`, payload)
        : await apiClient.post<ApiEnvelope<MonthlyBudget>>('/budgets', payload);

      setBudget(response.data.data);
      setMessage('予算を保存しました。');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Budgets</p>
          <h1>予算</h1>
        </div>
      </header>

      <section className="budget-layout">
        <div className="budget-hero">
          <div>
            <p className="eyebrow">{formatMonthLabel(form.year, form.month)}</p>
            <h2>今月の予算</h2>
          </div>
          <strong>{budget ? formatYen(displayedAmount) : '未設定'}</strong>
          <span>{budget ? 'この金額を基準にホームの残額を計算します。' : 'この月の予算はまだ設定されていません。'}</span>
        </div>

        <section className="panel budget-edit-panel">
          <div className="panel-header">
            <h2>予算を編集</h2>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-row">
              <label>
                年
                <input name="year" type="number" value={form.year} onChange={updateField} min="2000" max="2100" />
              </label>
              <label>
                月
                <input name="month" type="number" value={String(form.month).padStart(2, '0')} onChange={updateField} min="1" max="12" />
              </label>
            </div>
            <label>
              月間生活費予算
              <AmountInput name="amount" value={form.amount} onChange={updateField} />
            </label>
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
            <button className="primary-button" type="submit">
              {budget ? '予算を更新' : '予算を設定'}
            </button>
          </form>
        </section>
      </section>
    </section>
  );
}

export default BudgetsPage;
