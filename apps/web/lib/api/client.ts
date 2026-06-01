import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

// ── Create axios instance ─────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL:         BASE_URL,
  timeout:         30_000,
  withCredentials: true,           // send httpOnly refresh-token cookie
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ──────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ────────────────────────────────
let refreshing = false;
let queue: Array<{ resolve: (v: any) => void; reject: (e: any) => void; config: AxiosRequestConfig }> = [];

api.interceptors.response.use(
  res => res,
  async err => {
    const original: AxiosRequestConfig & { _retry?: boolean } = err.config;

    if (err.response?.status === 401 && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) =>
          queue.push({ resolve, reject, config: original }),
        );
      }

      original._retry = true;
      refreshing      = true;

      try {
        // httpOnly refresh token cookie is sent automatically
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        Cookies.set('accessToken', data.accessToken, { expires: 1 / 96, secure: true, sameSite: 'strict' });

        // Flush queued requests
        queue.forEach(({ resolve, config }) => resolve(api(config)));
        queue = [];

        return api(original);
      } catch (refreshErr) {
        queue.forEach(({ reject }) => reject(refreshErr));
        queue = [];
        Cookies.remove('accessToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        refreshing = false;
      }
    }

    // Normalise error message
    const message =
      err.response?.data?.message ??
      err.response?.data?.error  ??
      err.message                ??
      'Something went wrong';

    return Promise.reject({ ...err, message });
  },
);

export default api;
