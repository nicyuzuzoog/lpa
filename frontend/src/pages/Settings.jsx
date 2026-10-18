import { useEffect, useState } from 'react';
import { get, put } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { Button, Field, Input, Textarea } from '../components/Fields.jsx';
import { isEmail, isPhone } from '../utils/validate.js';

const IP = ['school_name', 'school_address', 'school_phone', 'school_email', 'receipt_prefix', 'currency', 'school_logo'];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: 'bi-brightness-high', hint: 'Bright white surfaces' },
  { value: 'dark', label: 'Dark', icon: 'bi-moon-stars', hint: 'Easy on the eyes at night' },
  { value: 'system', label: 'System', icon: 'bi-display', hint: 'Follow your device setting' },
];

function SectionCard({ icon, title, description, children }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-950/60 dark:text-green-400">
          <i className={`bi ${icon} text-lg`} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export default function Settings() {
  const { can } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get('/settings')
      .then((d) => {
        setSettings(d.settings);
        setForm({ ...d.settings });
      })
      .catch((e) => toast.error(e.message));
  }, [toast]);

  if (!settings) return <Spinner />;

  const save = async (e) => {
    e.preventDefault();
    if (!String(form.school_name || '').trim()) return toast.error('School name is required');
    if (!isEmail(form.school_email)) return toast.error('Enter a valid email address');
    if (!isPhone(form.school_phone)) return toast.error('Enter a valid phone number');
    if (form.currency && !/^[A-Za-z]{3}$/.test(String(form.currency).trim())) return toast.error('Currency must be a 3-letter code (e.g. RWF)');
    if (form.receipt_prefix && !/^[A-Za-z0-9-]{1,6}$/.test(String(form.receipt_prefix).trim())) return toast.error('Receipt prefix must be 1–6 letters/numbers');
    setSaving(true);
    try {
      const payload = {};
      for (const key of IP) payload[key] = form[key];
      const d = await put('/settings', payload);
      setSettings(d.settings);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="School profile, appearance and receipt details used across the application."
        actions={can('settings:manage') && <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>}
      />

      <div className="space-y-5">
        <SectionCard
          icon="bi-palette"
          title="Appearance"
          description="Choose how the application looks on this device. Your choice is saved on this browser."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setTheme(opt.value);
                    toast.success(`Appearance set to ${opt.label}`);
                  }}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    active
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200 dark:border-green-500 dark:bg-green-950/40 dark:ring-green-900'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
                  }`}
                  aria-pressed={active}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      active
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    <i className={`bi ${opt.icon} text-lg`} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {opt.label}
                      {active && <i className="bi bi-check2 ml-1.5 text-green-600 dark:text-green-400" />}
                    </span>
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{opt.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          icon="bi-building"
          title="School Profile"
          description="Shown in the sidebar, on receipts and in exported reports."
        >
          <form onSubmit={save} className="space-y-4">
            <Field label="School Name" required>
              <Input value={form.school_name || ''} onChange={(e) => setForm({ ...form, school_name: e.target.value })} placeholder="e.g. Light Peace Academy" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address">
                <Input value={form.school_address || ''} onChange={(e) => setForm({ ...form, school_address: e.target.value })} placeholder="e.g. KG 11 Ave, Kigali" />
              </Field>
              <Field label="Phone">
                <Input value={form.school_phone || ''} onChange={(e) => setForm({ ...form, school_phone: e.target.value })} placeholder="e.g. 0781234567" />
              </Field>
              <Field label="Email">
                <Input value={form.school_email || ''} onChange={(e) => setForm({ ...form, school_email: e.target.value })} placeholder="e.g. info@lightpeace.ac.rw" />
              </Field>
              <Field label="Currency">
                <Input value={form.currency || 'RWF'} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="e.g. RWF" />
              </Field>
            </div>
            <Field label="School Logo URL" hint="Optional image URL used on receipts and the sidebar.">
              <Textarea rows={2} value={form.school_logo || ''} onChange={(e) => setForm({ ...form, school_logo: e.target.value })} placeholder="e.g. https://example.com/logo.png" />
            </Field>
            {!can('settings:manage') && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                You have read-only access to settings.
              </p>
            )}
          </form>
        </SectionCard>

        <SectionCard icon="bi-receipt" title="Receipts" description="Defaults used when generating payment receipts.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Receipt Number Prefix" hint="Appears on every receipt, e.g. RCT-2026-000123.">
              <Input value={form.receipt_prefix || 'RCT'} onChange={(e) => setForm({ ...form, receipt_prefix: e.target.value })} placeholder="e.g. RCT" />
            </Field>
          </div>
          {can('settings:manage') && (
            <div className="mt-4">
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
