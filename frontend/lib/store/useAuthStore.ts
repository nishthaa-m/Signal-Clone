import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('signal_token', token);
      localStorage.setItem('signal_user', JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true });
  },

  updateUser: (partialUser) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...partialUser };
      if (typeof window !== 'undefined') {
        localStorage.setItem('signal_user', JSON.stringify(updated));
      }
      return { user: updated };
    });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('signal_token');
      localStorage.removeItem('signal_user');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  initAuth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('signal_token');
      const userStr = localStorage.getItem('signal_user');
      if (token && userStr) {
        try {
          const user: User = JSON.parse(userStr);
          set({ user, token, isAuthenticated: true });
        } catch {
          localStorage.removeItem('signal_token');
          localStorage.removeItem('signal_user');
        }
      }
    }
  },
}));
