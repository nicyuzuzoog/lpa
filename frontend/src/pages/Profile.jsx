import { useState } from 'react';
import { post } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { roleLabel, formatDateTime } from '../utils/format.js';
import { PageHeader } from '../components/ui.jsx';
import { Button, Field, PasswordInput } from '../components/Fields.jsx';
import { isStrongPassword } from '../utils/validate.js';

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const [pf, setPf] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    if (!pf.currentPassword || !pf.newPassword || !pf.confirmPassword) return toast.error('Fill in all fields');
    if (pf.newPassword !== pf.confirmPassword) return toast.error('New passwords do not match');
    if (!isStrongPassword(pf.newPassword)) return toast.error('Password must be at least 8 characters and include a letter and a number');
    if (pf.newPassword === pf.currentPassword) return toast.error('New password must be different from the current one');
    setSaving(true);
    try {
      await post('/auth/change-password', { currentPassword: pf.currentPassword, newPassword: pf.newPassword });
      toast.success('Password changed');
      setPf({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your account information." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Account Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Full Name</dt><dd className="font-medium">{user?.fullName}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Username</dt><dd className="font-medium">@{user?.username}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd className="font-medium">{user?.email || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Role</dt><dd className="font-medium">{roleLabel(user?.role)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Last Login</dt><dd className="font-medium">{user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Member Since</dt><dd className="font-medium">{user?.createdAt ? formatDateTime(user.createdAt) : '—'}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Change Password</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <Field label="Current Password" required>
              <PasswordInput value={pf.currentPassword} onChange={(e) => setPf({ ...pf, currentPassword: e.target.value })} autoComplete="current-password" placeholder="e.g. Your current password" />
            </Field>
            <Field label="New Password" required>
              <PasswordInput value={pf.newPassword} onChange={(e) => setPf({ ...pf, newPassword: e.target.value })} autoComplete="new-password" placeholder="e.g. Minimum 8 characters" />
            </Field>
            <Field label="Confirm New Password" required>
              <PasswordInput value={pf.confirmPassword} onChange={(e) => setPf({ ...pf, confirmPassword: e.target.value })} autoComplete="new-password" placeholder="e.g. Minimum 8 characters" />
            </Field>
            <Button type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update Password'}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}