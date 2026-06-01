import api from './client';
import type { AuthTokens, User } from '@/types';
import Cookies from 'js-cookie';

export const authApi = {
  async register(payload: {
    fullName: string; email: string; phone: string;
    password: string; accountType: 'user' | 'producer';
  }): Promise<{ pinId: string; userId: string }> {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  async verifyOtp(pinId: string, pin: string): Promise<AuthTokens> {
    const { data } = await api.post('/auth/verify-otp', { pinId, pin });
    _saveTokens(data);
    return data;
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await api.post('/auth/login', { email, password });
    _saveTokens(data);
    return data;
  },

  async logout(): Promise<void> {
    try { await api.post('/auth/logout'); } catch { /* swallow */ }
    Cookies.remove('accessToken');
  },

  async me(): Promise<User> {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password });
  },
};

function _saveTokens(tokens: AuthTokens) {
  Cookies.set('accessToken', tokens.accessToken, {
    expires:  1 / 96,   // 15 min
    secure:   true,
    sameSite: 'strict',
  });
  // refreshToken is httpOnly — set by server
}
