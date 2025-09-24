import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    try {
      await login({ email, password, remember });
      navigate('/');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to sign in.');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc)] px-4 py-12 dark:bg-[radial-gradient(circle_at_top,_#0c1220,_#111827)]">
      <div className="absolute inset-0 -z-10 opacity-70" aria-hidden>
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute -right-10 bottom-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      </div>
      <div className="grid w-full max-w-5xl grid-cols-1 gap-10 rounded-[32px] border border-white/40 bg-white/70 p-10 shadow-[0_40px_90px_-50px_rgba(80,80,120,0.6)] backdrop-blur-xl transition dark:border-border/60 dark:bg-bg/80 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between rounded-3xl bg-gradient-to-br from-brand/10 via-brand/5 to-transparent p-8">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-xl">
                <Wrench size={28} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-brand">WorkPro4 CMMS</p>
                <h1 className="text-3xl font-semibold text-fg">Precision Maintenance for Modern Ops</h1>
              </div>
            </div>
            <p className="mt-6 max-w-md text-sm text-mutedfg">
              Trusted by enterprise facility teams to orchestrate work orders, monitor assets, and keep technicians synchronized in real time.
            </p>
          </div>
          <div className="mt-10 space-y-5 text-sm text-fg">
            <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-white/60 p-4 shadow-sm dark:bg-muted/60">
              <ShieldCheck className="mt-1 h-5 w-5 text-brand" />
              <div>
                <p className="font-semibold">ISO-compliant access controls</p>
                <p className="text-mutedfg">Role-based permissions, audit-ready logs, and SSO that keeps your org secure.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-white/60 p-4 shadow-sm dark:bg-muted/60">
              <Sparkles className="mt-1 h-5 w-5 text-accent" />
              <div>
                <p className="font-semibold">AI-assisted scheduling</p>
                <p className="text-mutedfg">Predictive insights to automatically prioritize work and reduce downtime.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="flex flex-col justify-center rounded-3xl border border-border/60 bg-white/90 p-8 shadow-xl dark:bg-bg/90">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <header>
              <p className="text-xs font-semibold uppercase tracking-widest text-mutedfg">Sign in</p>
              <h2 className="mt-2 text-2xl font-semibold text-fg">Welcome back, let’s keep work moving</h2>
            </header>
            <div className="space-y-4">
              <label className="flex flex-col gap-2 text-sm font-semibold text-mutedfg">
                Email
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mutedfg" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    className="w-full rounded-2xl border border-border bg-white px-10 py-3 text-sm text-fg shadow-inner outline-none transition focus:ring-2 focus:ring-brand"
                    placeholder="you@company.com"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-mutedfg">
                Password
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mutedfg" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-border bg-white px-10 py-3 text-sm text-fg shadow-inner outline-none transition focus:ring-2 focus:ring-brand"
                    placeholder="Super secure password"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-mutedfg transition hover:text-fg"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            </div>
            <div className="flex items-center justify-between text-sm text-mutedfg">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                />
                Remember me
              </label>
              <a href="#" className="font-semibold text-brand transition hover:text-brand/80">
                Forgot password?
              </a>
            </div>
            {formError && (
              <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {formError}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold tracking-wide shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing in…' : 'Sign in to dashboard'}
            </button>
            <p className="text-center text-xs text-mutedfg">
              By continuing you agree to our{' '}
              <a href="#" className="font-semibold text-brand hover:text-brand/80">
                Terms
              </a>{' '}
              and{' '}
              <a href="#" className="font-semibold text-brand hover:text-brand/80">
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
