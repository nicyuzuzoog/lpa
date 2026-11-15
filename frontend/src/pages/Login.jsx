import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Input, PasswordInput } from '../components/Fields.jsx';

const HIGHLIGHTS = [
  { icon: 'bi-cash-coin', title: 'Fees & Receipts', text: 'Track payments, balances and print receipts instantly.' },
  { icon: 'bi-people', title: 'Students & Classes', text: 'Manage enrolment, classes and academic years.' },
  { icon: 'bi-clipboard-check', title: 'Teaching & Reports', text: 'Attendance, assessments and performance reports.' },
  { icon: 'bi-shield-check', title: 'Secure & Audited', text: 'Role-based access with a full audit trail.' },
];

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next = {};
    const u = username.trim();
    if (!u) next.username = 'Username or email is required';
    else if (u.length < 3) next.username = 'Enter at least 3 characters';
    if (!password) next.password = 'Password is required';
    else if (password.length < 4) next.password = 'Password must be at least 4 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      toast.success(`Welcome back, ${user.fullName}`);
      navigate('/app', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left branding panel */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <img src="/img/campus.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div className="lux-photo-overlay-soft absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob absolute -left-16 top-10 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl" />
          <div className="animate-blob delay-300 absolute -right-12 top-1/3 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="animate-spin-slow absolute -right-24 bottom-[-6rem] h-96 w-96 rounded-full border border-gold-300/10" />
          <div className="animate-spin-slow absolute -left-28 top-[-6rem] h-80 w-80 rounded-full border border-gold-300/10" />
        </div>

        <div className="relative z-10 p-10">
          <Link to="/" className="animate-fade-in flex items-center gap-3">
            <img src="/img/crest.svg" alt="" aria-hidden="true" className="animate-float h-12 w-12 drop-shadow-lg" />
            <span className="font-display text-lg font-semibold text-white">Light Peace Academy</span>
          </Link>
        </div>

        <div className="relative z-10 px-10">
          <h2 className="animate-fade-up max-w-md font-display text-4xl font-semibold leading-tight text-white">
            One platform for your whole school.
          </h2>
          <div className="lux-rule animate-fade-up delay-100 mt-4 w-24" />
          <p className="animate-fade-up delay-100 mt-4 max-w-md text-sm text-emerald-50/85">
            Fees, uniforms, academics and reporting — secure and effortless.
          </p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {HIGHLIGHTS.map((h, i) => (
              <li
                key={h.title}
                className={`animate-fade-up delay-${Math.min((i + 1) * 100, 500)} flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-400/15 text-gold-200">
                  <i className={`bi ${h.icon}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{h.title}</p>
                  <p className="text-xs text-emerald-50/70">{h.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 p-10">
          <p className="animate-fade-in text-xs text-emerald-50/60">
            © {new Date().getFullYear()} Light Peace Academy · Secure · Role-based access · Audit logged
          </p>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="flex items-center justify-center bg-gradient-to-br from-cream-50 to-cream-100 p-4 sm:p-8 dark:from-ink-950 dark:to-ink-900">
        <div className="w-full max-w-md">
          {/* Compact brand for small screens */}
          <Link to="/" className="animate-fade-in mb-6 flex items-center justify-center gap-2 lg:hidden">
            <img src="/img/crest.svg" alt="" aria-hidden="true" className="h-11 w-11" />
            <span className="font-display text-lg font-semibold text-ink-900 dark:text-cream-50">Light Peace Academy</span>
          </Link>

          <div className="animate-scale-in lux-card lux-topline rounded-3xl p-6 sm:p-8">
            <p className="lux-eyebrow">Welcome back</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900 dark:text-cream-50">Sign in</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">School Management &amp; Accounting System</p>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink-700 dark:text-cream-100/90">Username or Email</span>
                <Input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) setErrors((p) => ({ ...p, username: '' }));
                  }}
                  placeholder="e.g. accountant"
                  autoFocus
                  autoComplete="username"
                  aria-invalid={!!errors.username}
                  className={errors.username ? '!border-red-400 focus:!ring-red-100 dark:ring-red-900' : ''}
                />
                {errors.username && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{errors.username}</span>}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink-700 dark:text-cream-100/90">Password</span>
                <PasswordInput
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: '' }));
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  className={errors.password ? '!border-red-400 focus:!ring-red-100 dark:ring-red-900' : ''}
                />
                {errors.password && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{errors.password}</span>}
              </label>

              <Button type="submit" disabled={loading} className="shimmer w-full !py-2.5">
                {loading ? 'Signing in…' : 'Login'}
              </Button>
            </form>

            <p className="mt-5 rounded-xl border border-gold-100 bg-cream-100/70 px-3 py-2.5 text-center text-xs text-gray-500 dark:border-ink-700 dark:bg-ink-800/50 dark:text-gray-400">
              There is no public registration. Ask the Super Admin to create your account.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            <Link to="/" className="transition-colors hover:text-gold-600 dark:hover:text-gold-400">← Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
