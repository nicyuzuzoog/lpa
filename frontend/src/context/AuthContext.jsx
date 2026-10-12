import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { get, post } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sms_user')) || null;
    } catch {
      return null;
    }
  });
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(!!localStorage.getItem('sms_token'));

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem('sms_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await get('/auth/me');
      setUser(data.user);
      setPermissions(data.permissions || []);
      localStorage.setItem('sms_user', JSON.stringify(data.user));
    } catch {
      localStorage.removeItem('sms_token');
      localStorage.removeItem('sms_user');
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (username, password) => {
    const data = await post('/auth/login', { username, password });
    localStorage.setItem('sms_token', data.token);
    localStorage.setItem('sms_user', JSON.stringify(data.user));
    setUser(data.user);
    const session = await get('/auth/me');
    setPermissions(session.permissions || []);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    setUser(null);
    setPermissions([]);
  };

  const can = (permission) => permissions.includes(permission);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can, permissions, refresh: loadSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
