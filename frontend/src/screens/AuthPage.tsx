'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { getApiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import BrandMark from '@/components/BrandMark';
import BrandIllustration from '@/components/BrandIllustration';
import AppLoading from '@/components/AppLoading';

interface AuthPageProps {
  mode: 'login' | 'register';
}

interface AuthForm {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

type SubmittingAction = 'credentials' | 'guest' | null;

export default function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === 'register';
  const router = useRouter();
  const {
    isAuthenticated,
    isBootstrapping,
    login,
    loginAsGuest,
    register,
  } = useAuth();
  const [form, setForm] = useState<AuthForm>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [submittingAction, setSubmittingAction] =
    useState<SubmittingAction>(null);
  const isSubmitting = submittingAction !== null;

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
    setSubmittingAction('credentials');

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
      setSubmittingAction(null);
    }
  }

  async function handleGuestLogin() {
    setError('');
    setSubmittingAction('guest');

    try {
      await loginAsGuest();
      router.push('/dashboard');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmittingAction(null);
    }
  }

  if (isBootstrapping || isAuthenticated) {
    return <AppLoading />;
  }

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-story" aria-label="Budgetlyについて">
          <div className="auth-brand"><BrandMark size={44} /><strong>Budgetly</strong></div>
          <p className="eyebrow">YOUR LITTLE MONEY COMPANION</p>
          <h2>お金に、<br />ちょっと余裕を。</h2>
          <p className="auth-story-description">毎日の記録も、毎月のやりくりも。<br />あなたのペースで、ひとつずつ。</p>
          <BrandIllustration className="auth-mascot" size={340} priority />
          <div className="auth-features">
            <div><BrandIllustration kind="wallet" size={64} /><span>予算を決める</span></div>
            <div><BrandIllustration kind="receipt" size={64} /><span>かんたん記録</span></div>
            <div><BrandIllustration kind="chart" size={64} /><span>支出が見える</span></div>
          </div>
        </section>
        <section className="auth-panel">
          <div className="auth-heading">
            <p className="eyebrow">{isRegister ? 'はじめまして、Budgetlyです。' : 'おかえりなさい。'}</p>
            <h1>{isRegister ? 'アカウント作成' : 'ログイン'}</h1>
            <p className="page-description">{isRegister ? '今日から、あなたらしいお金の管理を。' : '今日のお金を、いっしょに整えましょう。'}</p>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            {isRegister && (
              <label>
                名前
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  autoComplete="name"
                  disabled={isSubmitting}
                  required
                />
              </label>
            )}

            <label>
              メールアドレス
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                autoComplete="email"
                disabled={isSubmitting}
                required
              />
            </label>

            <label>
              パスワード
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                disabled={isSubmitting}
                required
              />
            </label>

            {isRegister && (
              <label>
                パスワード確認
                <input
                  name="password_confirmation"
                  type="password"
                  value={form.password_confirmation}
                  onChange={updateField}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  required
                />
              </label>
            )}

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {submittingAction === 'credentials'
                ? '送信中...'
                : isRegister
                  ? '登録する'
                  : 'ログイン'}
            </button>
          </form>

          {!isRegister && (
            <div className="guest-entry">
              <div className="auth-divider" aria-hidden="true">
                <span>または</span>
              </div>
              <button
                className="secondary-button auth-guest-button"
                type="button"
                onClick={handleGuestLogin}
                disabled={isSubmitting}
                aria-describedby="guest-login-description"
              >
                <UserRound size={18} aria-hidden="true" />
                {submittingAction === 'guest'
                  ? 'ゲスト環境を準備中...'
                  : 'ゲストとして試す'}
              </button>
              <p id="guest-login-description" className="guest-description">
                登録なしで主要機能を24時間利用できます。利用終了時に入力データを削除します。
              </p>
            </div>
          )}

          <p className="auth-switch">
            {isRegister ? 'すでにアカウントがありますか？' : 'アカウントをお持ちではありませんか？'}{' '}
            <Link href={isRegister ? '/login' : '/register'}>{isRegister ? 'ログイン' : '登録する'}</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
