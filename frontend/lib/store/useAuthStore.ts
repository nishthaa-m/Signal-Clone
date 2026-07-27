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
      sessionStorage.setItem('signal_token', token);
      sessionStorage.setItem('signal_user', JSON.stringify(user));
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
        sessionStorage.setItem('signal_user', JSON.stringify(updated));
        localStorage.setItem('signal_user', JSON.stringify(updated));
      }
      return { user: updated };
    });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('signal_token');
      sessionStorage.removeItem('signal_user');
      localStorage.removeItem('signal_token');
      localStorage.removeItem('signal_user');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  initAuth: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('signal_token') || localStorage.getItem('signal_token');
      const userStr = sessionStorage.getItem('signal_user') || localStorage.getItem('signal_user');
      if (token && userStr) {
        try {
          const user: User = JSON.parse(userStr);
          set({ user, token, isAuthenticated: true });
        } catch {
          sessionStorage.removeItem('signal_token');
          sessionStorage.removeItem('signal_user');
          localStorage.removeItem('signal_token');
          localStorage.removeItem('signal_user');
        }
      }
    }
  },
}));
