export const CURRENCY = 'RWF';

export function money(n, withCurrency = true) {
  const value = Number(n) || 0;
  const formatted = value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return withCurrency ? `${formatted} RWF` : formatted;
}

export function formatDate(d, withTime = false) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function formatDateTime(d) {
  return formatDate(d, true);
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function statusColor(status) {
  switch (status) {
    case 'PAID':
    case 'ACTIVE':
    case 'RECEIVED':
      return 'bg-green-100 text-green-700 dark:bg-green-950/70 dark:text-green-400';
    case 'PARTIALLY_PAID':
    case 'INACTIVE':
    case 'PARTIAL':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400';
    case 'UNPAID':
    case 'VOID':
    case 'REVERSED':
    case 'DISABLED':
      return 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-400';
    case 'OVERPAID':
    case 'GRADUATED':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-400';
    case 'TRANSFERRED':
      return 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

// Statuses rendered in red (UNPAID, VOID, REVERSED, DISABLED …) so views can flag them loudly.
export const RED_STATUSES = ['UNPAID', 'VOID', 'REVERSED', 'DISABLED'];

export function isRedStatus(status) {
  return RED_STATUSES.includes(status);
}

export function paymentMethodLabel(m) {
  return { CASH: 'Cash', BANK: 'Bank', MOBILE_MONEY: 'Mobile Money', OTHER: 'Other' }[m] || m;
}

export function feeTypeLabel(t) {
  return { SCHOOL_FEES: 'School Fees', MATERIALS: 'Materials', UNIFORM: 'Uniform', MEALS: 'School Meals', OTHER: 'Other' }[t] || t;
}

export function roleLabel(r) {
  return {
    SUPER_ADMIN: 'Super Admin',
    ACCOUNTANT: 'Accountant',
    BIG_BOSS: 'Big Boss',
    TEACHER: 'Teacher',
  }[r] || r;
}
