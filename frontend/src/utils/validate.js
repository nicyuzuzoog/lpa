export const isBlank = (v) => v == null || String(v).trim() === '';

export const toNumber = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

export const isPositive = (v) => Number.isFinite(toNumber(v)) && toNumber(v) > 0;

export const isNonNegative = (v) => Number.isFinite(toNumber(v)) && toNumber(v) >= 0;

export const isIntInRange = (v, min, max) => {
  const n = toNumber(v);
  if (!Number.isInteger(n)) return false;
  if (min != null && n < min) return false;
  if (max != null && n > max) return false;
  return true;
};

export const isEmail = (v) => isBlank(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

export const isPhone = (v) => isBlank(v) || /^\+?[0-9][0-9\s-]{6,}$/.test(String(v).trim());

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const isFutureDate = (v) => {
  if (isBlank(v)) return false;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return false;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return d.getTime() > end.getTime();
};

export const isPlausibleDob = (v) => {
  if (isBlank(v)) return true;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getTime() <= now.getTime() && d.getFullYear() >= now.getFullYear() - 120;
};

export const isStrongPassword = (v) =>
  typeof v === 'string' && v.length >= 8 && /[A-Za-z]/.test(v) && /[0-9]/.test(v);

export const isValidUsername = (v) => /^[a-zA-Z0-9._-]{3,30}$/.test(String(v).trim());
