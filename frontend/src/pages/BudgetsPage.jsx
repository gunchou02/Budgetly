import { useEffect, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { formatMonthLabel, formatYen, getCurrentYearMonth } from '../utils/formatters';

function BudgetsPage() {
  const current = getCurrentYearMonth();
  const [form, setForm] = useState({
    year: current.year,
    month: current.month,
    amount: 40000,
  });
  const [budget, setBudget] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    async function fetchBudget() {
      setError('');
      setMessage('');

      try {
        const response = await apiClient.get('/budgets', {
          params: {
            year: form.year,
            month: form.month,
          },
        });

        if (isActive) {
          setBudget(response.data.data);
          if (response.data.data) {
            setForm((currentForm) => ({
              ...currentForm,
              amount: response.data.data.amount,
            }));
          }
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

  function updateField(event) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: Number(event.target.value),
    }));
  }

  async function handleSubmit(event) {
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
        ? await apiClient.put(`/budgets/${budget.id}`, payload)
        : await apiClient.post('/budgets', payload);

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

      <section className="panel two-column-panel">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              年
              <input name="year" type="number" value={form.year} onChange={updateField} min="2000" max="2100" />
            </label>
            <label>
              月
              <input name="month" type="number" value={form.month} onChange={updateField} min="1" max="12" />
            </label>
          </div>
          <label>
            月間生活費予算
            <input name="amount" type="number" value={form.amount} onChange={updateField} min="0" />
          </label>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <button className="primary-button" type="submit">
            保存
          </button>
        </form>

        <div className="detail-box">
          <span>{formatMonthLabel(form.year, form.month)}</span>
          <strong>{budget ? formatYen(budget.amount) : '未設定'}</strong>
        </div>
      </section>
    </section>
  );
}

export default BudgetsPage;
