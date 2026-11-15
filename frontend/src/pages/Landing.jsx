import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const BENEFITS = [
  { icon: 'bi-cash-stack', title: 'Fees & Payments', text: 'Partial payments, automatic balances, printable receipts and reversal tracking.' },
  { icon: 'bi-tags', title: 'Uniforms', text: 'Track payments separately from physical distribution, per size and gender.' },
  { icon: 'bi-bar-chart-line', title: 'Reports & Exports', text: 'Financial and uniform reports exported to PDF or Excel.' },
  { icon: 'bi-shield-lock', title: 'Security & Audit', text: 'Role-based access, hashed passwords and an immutable audit trail.' },
  { icon: 'bi-bell', title: 'Notifications', text: 'In-app alerts for payments and user activity.' },
  { icon: 'bi-mortarboard', title: 'Teaching & Records', text: 'Attendance, assessments and student records kept in one place.' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-20 border-b border-gold-100/70 bg-cream-50/85 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="animate-fade-in flex items-center gap-3">
            <img src="/img/crest.svg" alt="" aria-hidden="true" className="h-10 w-10" />
            <span className="font-display text-base font-semibold text-ink-900 dark:text-cream-50">Light Peace Academy</span>
          </div>
          <Link
            to={user ? '/app' : '/login'}
            className="shimmer rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-800 px-5 py-2 text-sm font-medium text-white shadow-[0_12px_26px_-14px_rgba(6,78,59,0.9)] transition-all hover:-translate-y-0.5"
          >
            {user ? 'Open Dashboard' : 'Login'}
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <img src="/img/campus.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div className="lux-photo-overlay absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="animate-fade-up inline-block rounded-full border border-gold-400/40 bg-white/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-200 backdrop-blur">
            School Management &amp; Accounting
          </span>
          <h1 className="animate-fade-up delay-100 mx-auto mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.1] text-white sm:text-6xl">
            Run your school’s finances and records <span className="lux-gold">in one place.</span>
          </h1>
          <p className="animate-fade-up delay-200 mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-emerald-50/85 sm:text-base">
            A secure, production-ready system for students, school fees, partial payments, receipts,
            uniform distribution, reports and audit logging.
          </p>
          <div className="animate-fade-up delay-300 mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="shimmer rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-7 py-3 text-sm font-semibold text-ink-950 shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Login to the System
            </Link>
            <div className="rounded-xl border border-white/20 px-5 py-3 text-sm text-emerald-50/80 backdrop-blur">
              Accounts are created by the Super Admin
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="lux-eyebrow">Everything in one place</p>
          <h2 className="animate-fade-up mt-2 font-display text-2xl font-semibold text-ink-900 dark:text-cream-50 sm:text-3xl">
            Everything the school office needs
          </h2>
          <div className="lux-rule mx-auto mt-4 w-28" />
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <div
              key={b.title}
              className={`animate-fade-up delay-${Math.min((i % 3) * 100 + 100, 500)} lux-card lux-topline group rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1`}
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-gold-100 to-gold-200 text-gold-700 transition-colors group-hover:from-emerald-600 group-hover:to-emerald-800 group-hover:text-gold-200 dark:from-ink-800 dark:to-ink-900 dark:text-gold-400">
                <i className={`bi ${b.icon} text-lg`} />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-900 dark:text-cream-50">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="lux-card overflow-hidden rounded-3xl sm:grid sm:grid-cols-2">
          <div className="relative min-h-[240px]">
            <img src="/img/hall.jpg" alt="Lecture hall" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950/40 to-transparent" />
          </div>
          <div className="p-7 sm:p-10">
            <p className="lux-eyebrow">Built for real school days</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink-900 dark:text-cream-50">
              From the classroom to the bursar’s desk
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Every fee, receipt and record is tracked end to end — so teachers, accountants and administrators
              always see the same, up-to-date picture.
            </p>
            <ul className="mt-6 space-y-3">
              {['Role-based access for every staff member', 'Instant balances and printable receipts', 'A complete, tamper-proof audit trail'].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-ink-700 dark:text-cream-100/90">
                  <i className="bi bi-patch-check-fill mt-0.5 text-gold-500" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/login"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-800 px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_26px_-14px_rgba(6,78,59,0.9)] transition-transform hover:-translate-y-0.5"
            >
              Get started <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gold-100/70 bg-cream-100/70 dark:border-ink-800 dark:bg-ink-950">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-7 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="text-xs text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} Light Peace Academy — School Management System</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Secure · Role-based access · Audit logged</p>
        </div>
      </footer>
    </div>
  );
}
