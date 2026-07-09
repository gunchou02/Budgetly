import { useEffect, useState } from 'react';
import { apiClient, getApiErrorMessage } from '../api/client';
import { formatYen } from '../utils/formatters';

function SubscriptionsPage() {
  const [categories, setCategories] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [status, setStatus] = useState('active');
  const [form, setForm] = useState({
    category_id: '',
    name: '',
    amount: '',
    billing_day: 1,
    started_at: new Date().toISOString().slice(0, 10),
    memo: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/categories')
      .then((response) => {
        setCategories(response.data.data);
        const subscriptionCategory = response.data.data.find((category) => category.name === 'サブスク');
        setForm((currentForm) => ({
          ...currentForm,
          category_id: subscriptionCategory?.id ?? response.data.data[0]?.id ?? '',
        }));
      })
      .catch((requestError) => setError(getApiErrorMessage(requestError)));
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [status]);

  async function fetchSubscriptions() {
    setError('');

    try {
      const response = await apiClient.get('/subscriptions', {
        params: { status },
      });
      setSubscriptions(response.data.data);
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

  function startEdit(subscription) {
    setEditingId(subscription.id);
    setForm({
      category_id: subscription.category_id,
      name: subscription.name,
      amount: subscription.amount,
      billing_day: subscription.billing_day,
      started_at: subscription.started_at.slice(0, 10),
      memo: subscription.memo ?? '',
    });
  }

  function resetForm() {
    const subscriptionCategory = categories.find((category) => category.name === 'サブスク');
    setEditingId(null);
    setForm({
      category_id: subscriptionCategory?.id ?? categories[0]?.id ?? '',
      name: '',
      amount: '',
      billing_day: 1,
      started_at: new Date().toISOString().slice(0, 10),
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
        billing_day: Number(form.billing_day),
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

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Subscriptions</p>
          <h1>サブスク</h1>
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
              サービス名
              <input name="name" value={form.name} onChange={updateForm} required />
            </label>
          </div>
          <div className="form-row">
            <label>
              月額料金
              <input name="amount" type="number" value={form.amount} onChange={updateForm} min="1" required />
            </label>
            <label>
              請求日
              <input name="billing_day" type="number" value={form.billing_day} onChange={updateForm} min="1" max="31" />
            </label>
            <label>
              開始日
              <input name="started_at" type="date" value={form.started_at} onChange={updateForm} required />
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
          <h2>サブスク一覧</h2>
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
          {subscriptions.length === 0 && <p className="muted-text">サブスクはまだありません。</p>}
        </div>
      </section>
    </section>
  );
}

export default SubscriptionsPage;
