import { useEffect, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import AmountInput from '../components/AmountInput';
import { formatDateValue, formatYen, getCurrentYearMonth, getDateValue } from '../utils/formatters';

function ExpensesPage() {
  const current = getCurrentYearMonth();
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [filters, setFilters] = useState({
    year: current.year,
    month: current.month,
    category_id: '',
  });
  const [form, setForm] = useState({
    category_id: '',
    title: '',
    amount: '',
    spent_at: formatDateValue(),
    memo: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/categories', { params: { type: 'expense' } })
      .then((response) => {
        setCategories(response.data.data);
        setForm((currentForm) => ({
          ...currentForm,
          category_id: response.data.data[0]?.id ?? '',
        }));
      })
      .catch((requestError) => setError(getApiErrorMessage(requestError)));
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [filters.year, filters.month, filters.category_id]);

  async function fetchExpenses() {
    setError('');

    try {
      const params = {
        year: filters.year,
        month: filters.month,
      };

      if (filters.category_id) {
        params.category_id = filters.category_id;
      }

      const response = await apiClient.get('/expenses', { params });
      setExpenses(response.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  function updateForm(event) {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }));
  }

  function updateFilter(event) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [event.target.name]: event.target.value === '' ? '' : Number(event.target.value),
    }));
  }

  function startEdit(expense) {
    setEditingId(expense.id);
    setForm({
      category_id: expense.category_id,
      title: expense.title,
      amount: expense.amount,
      spent_at: getDateValue(expense.spent_at),
      memo: expense.memo ?? '',
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      category_id: categories[0]?.id ?? '',
      title: '',
      amount: '',
      spent_at: formatDateValue(),
      memo: '',
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const payload = {
        ...form,
        category_id: Number(form.category_id),
        amount: Number(form.amount),
      };

      if (editingId) {
        await apiClient.put(`/expenses/${editingId}`, payload);
      } else {
        await apiClient.post('/expenses', payload);
      }

      resetForm();
      await fetchExpenses();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function deleteExpense(expenseId) {
    setError('');

    try {
      await apiClient.delete(`/expenses/${expenseId}`);
      await fetchExpenses();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Details</p>
          <h1>明細</h1>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section className="panel">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              カテゴリ
              <select name="category_id" value={form.category_id} onChange={updateForm} required>
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
          </div>
          <div className="form-row">
            <label>
              タイトル
              <input name="title" value={form.title} onChange={updateForm} required />
            </label>
            <label>
              金額
              <AmountInput name="amount" value={form.amount} onChange={updateForm} required />
            </label>
          </div>
          <label>
            メモ
            <input name="memo" value={form.memo} onChange={updateForm} />
          </label>
          <div className="button-row">
            <button className="primary-button" type="submit">
              {editingId ? '更新' : '登録'}
            </button>
            {editingId && (
              <button className="secondary-button" type="button" onClick={resetForm}>
                キャンセル
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header split">
          <h2>支出一覧</h2>
          <div className="table-filters">
            <input name="year" type="number" value={filters.year} onChange={updateFilter} min="2000" max="2100" />
            <input name="month" type="number" value={filters.month} onChange={updateFilter} min="1" max="12" />
            <select name="category_id" value={filters.category_id} onChange={updateFilter}>
              <option value="">すべて</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="data-table">
          {expenses.map((expense) => (
            <div className="table-row" key={expense.id}>
              <span>{getDateValue(expense.spent_at)}</span>
              <strong>{expense.title}</strong>
              <span>{expense.category?.name}</span>
              <strong>{formatYen(expense.amount)}</strong>
              <div className="row-actions">
                <button type="button" className="secondary-button" onClick={() => startEdit(expense)}>
                  編集
                </button>
                <button type="button" className="danger-button" onClick={() => deleteExpense(expense.id)}>
                  削除
                </button>
              </div>
            </div>
          ))}
          {expenses.length === 0 && <p className="muted-text">支出はまだありません。</p>}
        </div>
      </section>
    </section>
  );
}

export default ExpensesPage;
