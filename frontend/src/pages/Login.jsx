import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Input, PasswordInput } from '../components/Fields.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Username is required');
      return;
    }
    if (!password) {
      toast.error('Password is required');
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-800 via-green-700 to-green-900 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg font-bold text-white">G</div>
          <span className="text-lg font-semibold text-white">Greenfield Academy</span>
        </Link>

        <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <h1 className="text-xl font-bold text-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">School Management & Accounting System</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Username or Email</span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. accountant"
                autoFocus
                autoComplete="username"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Password</span>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            <Button type="submit" disabled={loading} className="w-full !py-2.5">
              {loading ? 'Signing in…' : 'Login'}
            </Button>
          </form>

          <p className="mt-5 rounded-lg bg-gray-50 px-3 py-2.5 text-center text-xs text-gray-500">
            There is no public registration. Ask the Super Admin to create your account.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-green-200">
          <Link to="/" className="hover:text-white">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
