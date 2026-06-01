import { create }    from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi }   from '../services/api';

interface User {
  id:         string;
  email:      string;
  fullName:   string;
  role:       'user' | 'producer' | 'admin';
  avatarUrl?: string;
  isVerified: boolean;
}

interface AuthState {
  user:        User | null;
  accessToken: string | null;
  loading:     boolean;

  login:       (email: string, password: string) => Promise<User>;
  logout:      () => Promise<void>;
  setUser:     (user: User | null) => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:        null,
  accessToken: null,
  loading:     false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const result = await authApi.login(email, password);
      set({ user: result.user, accessToken: result.accessToken, loading: false });
      return result.user;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null, accessToken: null });
  },

  setUser: user => set({ user }),

  restoreSession: async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) return;
    try {
      const user = await authApi.me();
      set({ user, accessToken: token });
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      set({ user: null, accessToken: null });
    }
  },
}));
