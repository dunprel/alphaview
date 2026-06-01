import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';
import { authApi } from '@/lib/api/auth';

interface AuthState {
  user:    User | null;
  loading: boolean;

  login:   (email: string, password: string) => Promise<User>;
  logout:  () => Promise<void>;
  setUser: (user: User | null) => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:    null,
      loading: false,

      login: async (email, password) => {
        set({ loading: true });
        try {
          const tokens = await authApi.login(email, password);
          set({ user: tokens.user, loading: false });
          return tokens.user;
        } catch (err) {
          set({ loading: false });
          throw err;
        }
      },

      logout: async () => {
        await authApi.logout();
        set({ user: null });
      },

      setUser: user => set({ user }),

      refresh: async () => {
        try {
          const user = await authApi.me();
          set({ user });
        } catch {
          set({ user: null });
        }
      },
    }),
    {
      name:    'alphaview-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({ user: state.user }),
    },
  ),
);
