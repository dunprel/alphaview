import axios, { AxiosInstance } from 'axios';
import * as SecureStore         from 'expo-secure-store';
import Constants                from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? 'https://api.alphaview.tv/v1';

// ── Axios instance ───────────────────────────────────────────────────────────
const client: AxiosInstance = axios.create({
  baseURL:  BASE_URL,
  timeout:  30_000,
  headers:  { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach access token ────────────────────────────────
client.interceptors.request.use(async config => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — auto refresh ─────────────────────────────────────
let refreshing = false;
let queue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

client.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401 && !err.config._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }));
      }
      err.config._retry = true;
      refreshing        = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        const { data }     = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        await SecureStore.setItemAsync('accessToken',  data.accessToken);
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);
        queue.forEach(q => q.resolve(client(err.config)));
        queue = [];
        return client(err.config);
      } catch (e) {
        queue.forEach(q => q.reject(e));
        queue = [];
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
      } finally {
        refreshing = false;
      }
    }
    const message = err.response?.data?.message ?? err.message ?? 'Something went wrong';
    return Promise.reject({ ...err, message, statusCode: err.response?.status });
  },
);

// ── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  async register(payload: { fullName: string; email: string; phone: string; password: string; accountType: string }) {
    const { data } = await client.post('/auth/register', payload);
    return data;
  },
  async verifyOtp(pinId: string, pin: string, userId: string) {
    const { data } = await client.post('/auth/verify-otp', { pinId, pin, userId });
    if (data.accessToken)  await SecureStore.setItemAsync('accessToken',  data.accessToken);
    if (data.refreshToken) await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    return data;
  },
  async login(email: string, password: string) {
    const { data } = await client.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('accessToken',  data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    return data;
  },
  async logout() {
    try { await client.post('/auth/logout'); } catch {}
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  },
  async me() {
    const { data } = await client.get('/auth/me');
    return data;
  },
};

// ── Content API ───────────────────────────────────────────────────────────────
export const contentApi = {
  async getHomeData() {
    const { data } = await client.get('/content/home');
    return data;
  },
  async browse(params: { page?: number; limit?: number; genre?: string; sort?: string; type?: string; search?: string } = {}) {
    const { data } = await client.get('/content', { params });
    return data;
  },
  async getById(id: string) {
    const { data } = await client.get(`/content/${id}`);
    return data;
  },
  async search(q: string) {
    const { data } = await client.get('/content/search', { params: { q } });
    return data;
  },
};

// ── Purchases API ─────────────────────────────────────────────────────────────
export const purchasesApi = {
  async initiate(contentId: string) {
    const { data } = await client.post('/purchases/initiate', { contentId });
    return data;
  },
  async verify(reference: string) {
    const { data } = await client.post(`/purchases/verify/${reference}`);
    return data;
  },
  async getLibrary() {
    const { data } = await client.get('/purchases/library');
    return data;
  },
  async getAccessStatus(contentId: string) {
    const { data } = await client.get(`/purchases/access/${contentId}`);
    return data;
  },
};

// ── Streaming API ─────────────────────────────────────────────────────────────
export const streamingApi = {
  async createSession(contentId: string) {
    const { data } = await client.post(`/stream/${contentId}/session`);
    return data;
  },
  async getContentMeta(contentId: string) {
    const { data } = await client.get(`/content/${contentId}?fields=id,title,durationMins,thumbnailUrl`);
    return data;
  },
  async heartbeat(contentId: string, payload: { playheadSecs: number; percentWatched: number; quality: string; deviceType: string }) {
    await client.post(`/stream/${contentId}/heartbeat`, payload);
  },
};

// ── Downloads API ─────────────────────────────────────────────────────────────
export const downloadsApi = {
  async authorise(contentId: string, deviceId: string) {
    const { data } = await client.post(`/downloads/${contentId}/authorise`, { deviceId });
    return data;
  },
  async getKey(keyId: string) {
    const { data } = await client.get(`/downloads/${keyId}/key`);
    return data;
  },
  async listDownloads() {
    const { data } = await client.get('/downloads');
    return data;
  },
  async revokeLocal(contentId: string) {
    await client.delete(`/downloads/${contentId}`);
  },
};

// ── Producer API ──────────────────────────────────────────────────────────────
export const producerApi = {
  async getDashboard() {
    const { data } = await client.get('/producer/dashboard');
    return data;
  },
  async follow(producerId: string)   { await client.post(`/producers/${producerId}/follow`); },
  async unfollow(producerId: string) { await client.delete(`/producers/${producerId}/follow`); },
  async getProfile(producerId: string) {
    const { data } = await client.get(`/producers/${producerId}`);
    return data;
  },
  async registerDeviceToken(token: string, platform: string) {
    await client.post('/users/device-token', { token, platform });
  },
};

export default client;
