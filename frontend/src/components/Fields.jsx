import { useState } from 'react';

const base =
  'w-full rounded-xl border border-gold-200/80 bg-white px-3 py-2 text-sm text-ink-900 placeholder-gray-400 transition-shadow focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-200 disabled:bg-cream-100 disabled:text-gray-500 dark:border-ink-700 dark:bg-ink-900 dark:text-cream-50 dark:placeholder-gray-500 dark:focus:border-gold-500 dark:focus:ring-gold-900/50 dark:disabled:bg-ink-800/60 dark:disabled:text-gray-500';

export function Field({ label, required, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-ink-700 dark:text-cream-100/90">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">{hint}</span>}
    </label>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`${base} ${className}`} {...props} />;
}

export function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} className={`${className} pr-10`} {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        title={show ? 'Hide password' : 'Show password'}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400 transition-colors hover:text-gold-600 dark:hover:text-gold-400"
        tabIndex={-1}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`${base} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${base} ${className}`} {...props} />;
}

export function Button({ variant = 'primary', className = '', children, ...props }) {
  const styles = {
    primary:
      'bg-gradient-to-b from-emerald-600 to-emerald-800 text-white shadow-[0_12px_26px_-14px_rgba(6,78,59,0.9)] hover:from-emerald-500 hover:to-emerald-700 disabled:from-emerald-300 disabled:to-emerald-400 disabled:shadow-none dark:from-emerald-600 dark:to-emerald-800 dark:hover:from-emerald-500 dark:hover:to-emerald-700',
    secondary:
      'border border-gold-200 bg-white text-ink-700 hover:bg-gold-50 dark:border-ink-700 dark:bg-ink-800 dark:text-cream-100 dark:hover:bg-ink-700',
    danger:
      'bg-gradient-to-b from-red-600 to-red-700 text-white shadow-[0_12px_26px_-14px_rgba(153,27,27,0.9)] hover:from-red-500 hover:to-red-600 disabled:from-red-300 disabled:to-red-400 disabled:shadow-none',
    ghost: 'text-ink-700 hover:bg-gold-50 dark:text-cream-100 dark:hover:bg-ink-800',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
