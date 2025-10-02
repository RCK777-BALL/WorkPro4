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
      await login({ email, username: email, password });
      navigate('/');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to sign in.');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc)] px-4 py-12 dark:bg-[radial-gradient(circle_at_top,_#0c1220,_#111827)]">
      <div className="absolute inset-0 -z-10 opacity-70" aria-hidden>
        <div className="absolute rounded-full -left-24 top-16 h-72 w-72 bg-brand/20 blur-3xl" />
        <div className="absolute w-64 h-64 rounded-full -right-10 bottom-10 bg-accent/20 blur-3xl" />
      </div>
      <div className="grid w-full max-w-5xl grid-cols-1 gap-10 rounded-[32px] border border-white/40 bg-white/70 p-10 shadow-[0_40px_90px_-50px_rgba(80,80,120,0.6)] backdrop-blur-xl transition dark:border-border/60 dark:bg-bg/80 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between p-8 rounded-3xl bg-gradient-to-br from-brand/10 via-brand/5 to-transparent">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center text-white shadow-xl h-14 w-14 rounded-2xl bg-brand">
                <Wrench size={28} />

              </div>
              <div>
                <p className="text-sm font-semibold tracking-widest uppercase text-brand">WorkPro4 CMMS</p>
                <h1 className="text-3xl font-semibold text-fg">Precision Maintenance for Modern Ops</h1>
              </div>
            </div>
            <p className="max-w-md mt-6 text-sm text-mutedfg">
              Trusted by enterprise facility teams to orchestrate work orders, monitor assets, and keep technicians synchronized in real time.
            </p>
          </div>
          <div className="mt-10 space-y-5 text-sm text-fg">
            <div className="flex items-start gap-3 p-4 border shadow-sm rounded-2xl border-border/60 bg-white/60 dark:bg-muted/60">
              <ShieldCheck className="w-5 h-5 mt-1 text-brand" />
              <div>
                <p className="font-semibold">ISO-compliant access controls</p>
                <p className="text-mutedfg">Role-based permissions, audit-ready logs, and SSO that keeps your org secure.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 border shadow-sm rounded-2xl border-border/60 bg-white/60 dark:bg-muted/60">
              <Sparkles className="w-5 h-5 mt-1 text-accent" />
              <div>
                <p className="font-semibold">AI-assisted scheduling</p>
                <p className="text-mutedfg">Predictive insights to automatically prioritize work and reduce downtime.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="flex flex-col justify-center p-8 border shadow-xl rounded-3xl border-border/60 bg-white/90 dark:bg-bg/90">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <header>
              <p className="text-xs font-semibold tracking-widest uppercase text-mutedfg">Sign in</p>
              <h2 className="mt-2 text-2xl font-semibold text-fg">Welcome back, let’s keep work moving</h2>
            </header>
            <div className="space-y-4">
              <label className="flex flex-col gap-2 text-sm font-semibold text-mutedfg">
                Email
                <div className="relative">
                  <Mail className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-4 top-1/2 text-mutedfg" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    className="w-full px-10 py-3 text-sm transition bg-white border shadow-inner outline-none rounded-2xl border-border text-fg focus:ring-2 focus:ring-brand"
                    placeholder="you@company.com"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-mutedfg">

                Password
                <div className="relative">
                  <Lock className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-4 top-1/2 text-mutedfg" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="w-full px-10 py-3 text-sm transition bg-white border shadow-inner outline-none rounded-2xl border-border text-fg focus:ring-2 focus:ring-brand"
                    placeholder="Super secure password"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute flex items-center justify-center transition -translate-y-1/2 rounded-full right-3 top-1/2 h-9 w-9 bg-muted text-mutedfg hover:text-fg"
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
                  className="w-4 h-4 rounded border-border text-brand focus:ring-brand"
                />
                Remember me
              </label>
              <a href="#" className="font-semibold transition text-brand hover:text-brand/80">
                Forgot password?
              </a>
            </div>
            {formError && (
              <div className="px-4 py-3 text-sm border rounded-2xl border-danger/30 bg-danger/10 text-danger">
                {formError}

              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center w-full px-4 py-3 text-sm font-semibold tracking-wide transition shadow-lg btn-primary rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing in…' : 'Sign in to dashboard'}

            </button>
            <p className="text-xs text-center text-mutedfg">
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
