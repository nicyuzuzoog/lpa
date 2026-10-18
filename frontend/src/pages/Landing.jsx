import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const BENEFITS = [
  { icon: 'bi-cash-stack', title: 'Fees & Payments', text: 'Partial payments, automatic balances, printable receipts and reversal tracking.' },
  { icon: 'bi-box-seam', title: 'Inventory Control', text: 'Receive, issue and track stock with low-stock alerts and full history.' },
  { icon: 'bi-tags', title: 'Uniforms', text: 'Track payments separately from physical distribution, per size and gender.' },
  { icon: 'bi-bar-chart-line', title: 'Reports & Exports', text: 'Financial, inventory and uniform reports exported to PDF or Excel.' },
  { icon: 'bi-shield-lock', title: 'Security & Audit', text: 'Role-based access, hashed passwords and an immutable audit trail.' },
  { icon: 'bi-bell', title: 'Notifications', text: 'In-app alerts for payments, stock changes and user activity.' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen overflow-x-hidden bg-white dark:bg-gray-950">
      <header className="sticky top-0 z-20 border-b border-green-100 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-700 text-sm font-bold text-white">L</div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Light Peace Academy</span>
          </div>
          <Link
            to={user ? '/app' : '/login'}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-700 hover:shadow-lg"
          >
            {user ? 'Open Dashboard' : 'Login'}
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-b from-green-700 to-green-800">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob absolute -left-16 top-6 h-64 w-64 rounded-full bg-green-400/20 blur-3xl" />
          <div className="animate-blob delay-300 absolute -right-10 top-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="animate-blob delay-700 absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-lime-300/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="animate-fade-up inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-green-100">
            School Management &amp; Accounting
          </span>
          <h1 className="animate-fade-up delay-100 mx-auto mt-5 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-5xl">
            Run your school’s finances, stock and records in one place.
          </h1>
          <p className="animate-fade-up delay-200 mx-auto mt-4 max-w-2xl text-sm text-green-100 sm:text-base">
            A secure, production-ready system for students, school fees, partial payments, receipts, materials
            inventory, uniform distribution, reports and audit logging.
          </p>
          <div className="animate-fade-up delay-300 mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="shimmer rounded-lg bg-white px-6 py-3 text-sm font-semibold text-green-800 shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-green-50"
            >
              Login to the System
            </Link>
            <div className="rounded-lg border border-white/25 px-5 py-3 text-sm text-green-100">
              Accounts are created by the Super Admin
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="animate-fade-up text-center text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Everything the school office needs</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <div
              key={b.title}
              className={`animate-fade-up delay-${Math.min((i % 3) * 100 + 100, 500)} group rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-green-200 hover:shadow-lg`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 transition-colors group-hover:bg-green-600 group-hover:text-white">
                <i className={`bi ${b.icon} text-lg`} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="text-xs text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} Light Peace Academy — School Management System</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Secure · Role-based access · Audit logged</p>
        </div>
      </footer>
    </div>
  );
}
