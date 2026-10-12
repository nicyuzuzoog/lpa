import { useEffect, useState } from 'react';
import { get, put } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, Spinner } from '../components/ui.jsx';
import { Button, Field, Input, Textarea } from '../components/Fields.jsx';

const IP = ['school_name', 'school_address', 'school_phone', 'school_email', 'receipt_prefix', 'currency'];

export default function Settings() {
  const { can } = useAuth();
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
    if (form.school_email && (!String(form.school_email).includes('@') || !String(form.school_email).includes('.'))) return toast.error('Enter a valid email address');
    if (form.school_phone && !/^[0-9+\s-]{7,}$/.test(String(form.school_phone).trim())) return toast.error('Enter a valid phone number');
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
    <div>
      <PageHeader
        title="Settings"
        subtitle="System settings used on receipts and the application."
        actions={can('settings:manage') && <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>}
      />

      <form onSubmit={save} className="max-w-2xl space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <Field label="School Name" required>
          <Input value={form.school_name || ''} onChange={(e) => setForm({ ...form, school_name: e.target.value })} placeholder="e.g. Greenfield Academy" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address">
            <Input value={form.school_address || ''} onChange={(e) => setForm({ ...form, school_address: e.target.value })} placeholder="e.g. KG 11 Ave, Kigali" />
          </Field>
          <Field label="Phone">
            <Input value={form.school_phone || ''} onChange={(e) => setForm({ ...form, school_phone: e.target.value })} placeholder="e.g. 0781234567" />
          </Field>
          <Field label="Email">
            <Input value={form.school_email || ''} onChange={(e) => setForm({ ...form, school_email: e.target.value })} placeholder="e.g. info@greenfield.ac.rw" />
          </Field>
          <Field label="Currency">
            <Input value={form.currency || 'RWF'} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="e.g. RWF" />
          </Field>
          <Field label="Receipt Number Prefix">
            <Input value={form.receipt_prefix || 'RCT'} onChange={(e) => setForm({ ...form, receipt_prefix: e.target.value })} placeholder="e.g. RCT" />
          </Field>
        </div>
        <Field label="School Logo URL" hint="Optional image URL used on receipts.">
          <Textarea rows={2} value={form.school_logo || ''} onChange={(e) => setForm({ ...form, school_logo: e.target.value })} placeholder="e.g. https://example.com/logo.png" />
        </Field>
        {!can('settings:manage') && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">You have read-only access to settings.</p>
        )}
      </form>
    </div>
  );
}