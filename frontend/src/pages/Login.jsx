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
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-green-800 via-green-700 to-emerald-900 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob absolute -left-16 top-10 h-72 w-72 rounded-full bg-green-400/20 blur-3xl" />
          <div className="animate-blob delay-300 absolute -right-12 top-1/3 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="animate-blob delay-700 absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="animate-spin-slow absolute -right-24 bottom-[-6rem] h-96 w-96 rounded-full border border-white/10" />
          <div className="animate-spin-slow absolute -left-28 top-[-6rem] h-80 w-80 rounded-full border border-white/10" />
        </div>

        <div className="relative z-10 p-10">
          <Link to="/" className="animate-fade-in flex items-center gap-3">
            <div className="animate-float flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white backdrop-blur">
              L
            </div>
            <span className="text-lg font-semibold text-white">Light Peace Academy</span>
          </Link>
        </div>

        <div className="relative z-10 px-10">
          <h2 className="animate-fade-up max-w-md text-3xl font-bold leading-tight text-white">
            One platform for your whole school.
          </h2>
          <p className="animate-fade-up delay-100 mt-3 max-w-md text-sm text-green-100">
            Fees, inventory, uniforms, academics and reporting — secure and effortless.
          </p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {HIGHLIGHTS.map((h, i) => (
              <li
                key={h.title}
                className={`animate-fade-up delay-${Math.min((i + 1) * 100, 500)} flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-green-50">
                  <i className={`bi ${h.icon}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{h.title}</p>
                  <p className="text-xs text-green-100/80">{h.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 p-10">
          <p className="animate-fade-in text-xs text-green-100/70">
            © {new Date().getFullYear()} Light Peace Academy · Secure · Role-based access · Audit logged
          </p>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="flex items-center justify-center bg-gradient-to-br from-gray-50 to-white p-4 sm:p-8 dark:from-gray-950 dark:to-gray-900">
        <div className="w-full max-w-md">
          {/* Compact brand for small screens */}
          <Link to="/" className="animate-fade-in mb-6 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-700 text-lg font-bold text-white">L</div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Light Peace Academy</span>
          </Link>

          <div className="animate-scale-in rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl sm:p-8">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sign in</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">School Management &amp; Accounting System</p>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Username or Email</span>
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
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Password</span>
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

            <p className="mt-5 rounded-lg bg-gray-50 dark:bg-gray-800/40 px-3 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400">
              There is no public registration. Ask the Super Admin to create your account.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            <Link to="/" className="transition-colors hover:text-green-700 dark:hover:text-green-400">← Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
