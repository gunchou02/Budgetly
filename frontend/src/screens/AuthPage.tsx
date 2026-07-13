'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { getApiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';

interface AuthPageProps {
  mode: 'login' | 'register';
}

interface AuthForm {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export default function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === 'register';
  const router = useRouter();
  const { isAuthenticated, isBootstrapping, login, register } = useAuth();
  const [form, setForm] = useState<AuthForm>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isBootstrapping && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isBootstrapping, router]);

  function updateField(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

      router.push('/dashboard');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isBootstrapping || isAuthenticated) {
    return <div className="loading-screen">読み込み中...</div>;
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
          <Link href={isRegister ? '/login' : '/register'}>{isRegister ? 'ログイン' : '登録する'}</Link>
        </p>
      </section>
    </main>
  );
}
