import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const { isAuthenticated, login, register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register(form);
      } else {
        await login({
          email: form.email,
          password: form.password,
        });
      }

      navigate('/dashboard');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <span className="brand-mark">B</span>
          <p className="eyebrow">Budgetly</p>
          <h1>{isRegister ? 'アカウント作成' : 'ログイン'}</h1>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          {isRegister && (
            <label>
              名前
              <input name="name" value={form.name} onChange={updateField} required />
            </label>
          )}

          <label>
            メールアドレス
            <input name="email" type="email" value={form.email} onChange={updateField} required />
          </label>

          <label>
            パスワード
            <input name="password" type="password" value={form.password} onChange={updateField} required />
          </label>

          {isRegister && (
            <label>
              パスワード確認
              <input
                name="password_confirmation"
                type="password"
                value={form.password_confirmation}
                onChange={updateField}
                required
              />
            </label>
          )}

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '送信中...' : isRegister ? '登録する' : 'ログイン'}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? 'すでにアカウントがありますか？' : 'アカウントをお持ちではありませんか？'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'ログイン' : '登録する'}</Link>
        </p>
      </section>
    </main>
  );
}

export default AuthPage;
