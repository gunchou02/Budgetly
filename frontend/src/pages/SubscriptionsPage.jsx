import { useEffect, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import AmountInput from '../components/AmountInput';
import { formatDateValue, formatYen, getDateValue } from '../utils/formatters';

function getDayFromDateValue(dateValue) {
  return Number(dateValue.split('-')[2]);
}

export function SubscriptionsManager({ showHeader = true }) {
  const today = formatDateValue();
  const [categories, setCategories] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [status, setStatus] = useState('active');
  const [form, setForm] = useState({
    category_id: '',
    name: '',
    amount: '',
    billing_day: getDayFromDateValue(today),
    started_at: today,
    memo: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories(selectedCategoryId = '') {
    setError('');

    try {
      const response = await apiClient.get('/categories', { params: { type: 'fixed' } });
      setCategories(response.data.data);
      const subscriptionCategory = response.data.data.find((category) => category.name === 'サブスク');

      setForm((currentForm) => ({
        ...currentForm,
        category_id: selectedCategoryId || currentForm.category_id || subscriptionCategory?.id || response.data.data[0]?.id || '',
      }));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  useEffect(() => {
    fetchSubscriptions();
  }, [status]);

  async function fetchSubscriptions() {
    setError('');

    try {
      const [listResponse, activeResponse] = await Promise.all([
        apiClient.get('/subscriptions', {
          params: { status },
        }),
        apiClient.get('/subscriptions', {
          params: { status: 'active' },
        }),
      ]);
      setSubscriptions(listResponse.data.data);
      setActiveSubscriptions(activeResponse.data.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function startEdit(subscription) {
    setEditingId(subscription.id);
    setForm({
      category_id: subscription.category_id,
      name: subscription.name,
      amount: subscription.amount,
      billing_day: subscription.billing_day,
      started_at: getDateValue(subscription.started_at),
      memo: subscription.memo ?? '',
    });
  }

  function resetForm() {
    const subscriptionCategory = categories.find((category) => category.name === 'サブスク');
    const todayValue = formatDateValue();

    setEditingId(null);
    setForm({
      category_id: subscriptionCategory?.id ?? categories[0]?.id ?? '',
      name: '',
      amount: '',
      billing_day: getDayFromDateValue(todayValue),
      started_at: todayValue,
      memo: '',
    });
  }

  async function createCategory() {
    const name = newCategoryName.trim();

    if (!name) {
      return;
    }

    setError('');

    try {
      const response = await apiClient.post('/categories', {
        name,
        type: 'fixed',
      });

      setNewCategoryName('');
      await fetchCategories(response.data.data.id);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const payload = {
        ...form,
        category_id: Number(form.category_id),
        amount: Number(form.amount),
        billing_day: getDayFromDateValue(form.started_at),
        billing_cycle: 'monthly',
      };

      if (editingId) {
        await apiClient.put(`/subscriptions/${editingId}`, payload);
      } else {
        await apiClient.post('/subscriptions', payload);
      }

      resetForm();
      await fetchSubscriptions();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function cancelSubscription(subscriptionId) {
    setError('');

    try {
      await apiClient.patch(`/subscriptions/${subscriptionId}/cancel`);
      await fetchSubscriptions();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function deleteSubscription(subscriptionId) {
    setError('');

    try {
      await apiClient.delete(`/subscriptions/${subscriptionId}`);
      await fetchSubscriptions();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  const activeTotal = activeSubscriptions.reduce((total, subscription) => total + Number(subscription.amount), 0);
  const nextBillingItems = activeSubscriptions
    .slice()
    .sort((first, second) => first.billing_day - second.billing_day)
    .slice(0, 3);
  const selectedSubscriptionCategory = subscriptions
    .map((subscription) => subscription.category)
    .find((category) => category?.id === Number(form.category_id));
  const categoryOptions = selectedSubscriptionCategory && !categories.some((category) => category.id === selectedSubscriptionCategory.id)
    ? [...categories, selectedSubscriptionCategory]
    : categories;

  return (
    <section className="page-stack">
      {showHeader && (
        <header className="page-header">
          <div>
            <p className="eyebrow">Subscriptions</p>
            <h1>固定費・サブスク</h1>
          </div>
        </header>
      )}

      {error && <p className="form-error">{error}</p>}

      <section className="subscription-layout">
        <div className="subscription-hero">
          <div>
            <p className="eyebrow">Monthly Fixed Cost</p>
            <h2>今月の固定費</h2>
          </div>
          <strong>{formatYen(activeTotal)}</strong>
          <span>有効 {activeSubscriptions.length}件 / 毎月の固定支出</span>
          {nextBillingItems.length > 0 && (
            <div className="subscription-hero-list">
              {nextBillingItems.map((subscription) => (
                <div key={subscription.id}>
                  <span>毎月{subscription.billing_day}日</span>
                  <strong>{subscription.name}</strong>
                  <span>{formatYen(subscription.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <section className="panel subscription-edit-panel">
          <div className="panel-header">
            <h2>{editingId ? '固定費を編集' : '固定費を追加'}</h2>
          </div>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              項目名
              <input name="name" value={form.name} onChange={updateForm} required />
            </label>
            <label>
              カテゴリ
              <select name="category_id" value={form.category_id} onChange={updateForm} required>
                {categoryOptions.length === 0 && <option value="">カテゴリなし</option>}
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-category-form">
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="固定費カテゴリを追加"
              />
              <button className="secondary-button" type="button" onClick={createCategory}>
                追加
              </button>
            </div>
            <div className="form-row">
              <label>
                月額
                <AmountInput name="amount" value={form.amount} onChange={updateForm} required />
              </label>
              <label>
                初回日
                <input name="started_at" type="date" value={form.started_at} onChange={updateForm} required />
              </label>
            </div>
            <label>
              メモ
              <input name="memo" value={form.memo} onChange={updateForm} />
            </label>
            <div className="button-row">
              <button className="primary-button" type="submit">
                {editingId ? '固定費を更新' : '固定費を登録'}
              </button>
              {editingId && (
                <button className="secondary-button" type="button" onClick={resetForm}>
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </section>
      </section>

      <section className="panel">
        <div className="panel-header split">
          <h2>固定費一覧</h2>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="active">有効</option>
            <option value="canceled">解約済み</option>
            <option value="all">すべて</option>
          </select>
        </div>

        <div className="data-table">
          {subscriptions.map((subscription) => (
            <div className="table-row" key={subscription.id}>
              <span>毎月{subscription.billing_day}日</span>
              <strong>{subscription.name}</strong>
              <span>{subscription.category?.name}</span>
              <strong>{formatYen(subscription.amount)}</strong>
              <div className="row-actions">
                <button type="button" className="secondary-button" onClick={() => startEdit(subscription)}>
                  編集
                </button>
                {!subscription.canceled_at && (
                  <button type="button" className="secondary-button" onClick={() => cancelSubscription(subscription.id)}>
                    解約
                  </button>
                )}
                <button type="button" className="danger-button" onClick={() => deleteSubscription(subscription.id)}>
                  削除
                </button>
              </div>
            </div>
          ))}
          {subscriptions.length === 0 && <p className="muted-text">固定費はまだありません。</p>}
        </div>
      </section>
    </section>
  );
}

function SubscriptionsPage() {
  return <SubscriptionsManager />;
}

export default SubscriptionsPage;
