import { useState } from 'react';
import { KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { Alert, ToastViewport } from '../components/ui';
import { useInventoryApp } from './useInventoryApp.jsx';
import LanguageSwitcher from './LanguageSwitcher';
import loginHero from '../assets/login-hero.png';

export default function LoginPage() {
  const { loadError, login, toasts, dismissToast, language, setLanguage, t } = useInventoryApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    setSubmitting(true);

    const result = await login({ email, password });
    if (!result.ok) {
      setSubmitError(result.message);
    }

    setSubmitting(false);
  }

  return (
    <div className="page-shell">
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <div className="relative h-screen overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.06),transparent_24%)]">
        <div className="pointer-events-none absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-[var(--secondary-soft)] blur-3xl" />
        <div className="pointer-events-none absolute right-[-5rem] top-1/3 h-64 w-64 rounded-full bg-slate-200/60 blur-3xl" />
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <LanguageSwitcher language={language} onChange={setLanguage} t={t} />
        </div>
        <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid w-full gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
            <section className="relative hidden min-h-[660px] overflow-hidden rounded-[36px] border border-slate-200 bg-[var(--login-hero-bg)] p-4 shadow-[0_24px_70px_rgba(15,23,42,0.2)] lg:block">
              <div className="h-full w-full overflow-hidden rounded-[28px] bg-[var(--login-hero-bg)]">
                <img src={loginHero} alt="" className="h-full w-full object-contain object-center" />
              </div>
            </section>

            <section className="panel-strong relative w-full overflow-hidden p-6 sm:p-8 lg:flex lg:min-h-[660px] lg:flex-col lg:justify-center">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--secondary-soft)] to-transparent" />
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--secondary-soft)] text-[var(--secondary-strong)] ring-1 ring-[var(--secondary-soft)]">
                  <KeyRound size={22} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{t('app.brand')}</p>
                  <h2 className="text-xl font-black text-slate-950">{t('auth.loginTitle')}</h2>
                </div>
              </div>

              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-500">
                {t('dashboard.description')}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{t('nav.products')}</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{t('dashboard.stockValue')}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{t('nav.eveningSettlement')}</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{t('dashboard.payableToday')}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{t('nav.activityLogs')}</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{t('activityLogs.tableTitle')}</p>
                </div>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                {loadError ? <Alert type="error">{loadError}</Alert> : null}
                {submitError ? <Alert type="error">{submitError}</Alert> : null}

                <label className="block">
                  <span className="label">{t('auth.email')}</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      className="input pl-10"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="label">{t('auth.password')}</span>
                  <span className="relative block">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      className="input pl-10"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                    />
                  </span>
                </label>

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                  {submitting ? t('auth.signingIn') : t('auth.signIn')}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
