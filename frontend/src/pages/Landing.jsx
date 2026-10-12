import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const BENEFITS = [
  { title: 'Fees & Payments', text: 'Partial payments, automatic balances, printable receipts and reversal tracking.' },
  { title: 'Inventory Control', text: 'Receive, issue and track stock with low-stock alerts and full history.' },
  { title: 'Uniforms', text: 'Track payments separately from physical distribution, per size and gender.' },
  { title: 'Reports & Exports', text: 'Financial, inventory and uniform reports exported to PDF or Excel.' },
  { title: 'Security & Audit', text: 'Role-based access, hashed passwords and an immutable audit trail.' },
  { title: 'Notifications', text: 'In-app alerts for payments, stock changes and user activity.' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-green-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-700 text-sm font-bold text-white">G</div>
            <span className="text-sm font-semibold text-gray-900">Greenfield Academy</span>
          </div>
          <Link
            to={user ? '/app' : '/login'}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            {user ? 'Open Dashboard' : 'Login'}
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-green-700 to-green-800">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-green-100">
            School Management & Accounting
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-5xl">
            Run your school’s finances, stock and records in one place.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-green-100 sm:text-base">
            A secure, production-ready system for students, school fees, partial payments, receipts, materials
            inventory, uniform distribution, reports and audit logging.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-green-800 shadow-lg hover:bg-green-50"
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
        <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">Everything the school office needs</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 h-1.5 w-10 rounded-full bg-green-500" />
              <h3 className="text-sm font-semibold text-gray-900">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} Greenfield Academy — School Management System</p>
          <p className="text-xs text-gray-400">Secure · Role-based access · Audit logged</p>
        </div>
      </footer>
    </div>
  );
}
