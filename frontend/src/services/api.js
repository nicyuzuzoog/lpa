import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api',
  // Render free tier cold-starts can exceed 30s after the instance sleeps.
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Request failed';
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('sms_token');
      localStorage.removeItem('sms_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(new Error(message));
  }
);

export async function get(url, params) {
  const res = await api.get(url, { params });
  return res.data;
}

export async function post(url, data) {
  const res = await api.post(url, data);
  return res.data;
}

export async function put(url, data) {
  const res = await api.put(url, data);
  return res.data;
}

export async function apiDelete(url) {
  const res = await api.delete(url);
  return res.data;
}

export default api;
