import { create } from 'zustand';
import { User } from '../types/index.js';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const savedToken = localStorage.getItem('binge_token');
  const savedUser = localStorage.getItem('binge_user');

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: savedToken || null,
    isAuthenticated: !!savedToken,
    setAuth: (user, token) => {
      localStorage.setItem('binge_token', token);
      localStorage.setItem('binge_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('binge_token');
      localStorage.removeItem('binge_user');
      set({ user: null, token: null, isAuthenticated: false });
    },
    updateUser: (partial) => {
      set((state) => {
        if (!state.user) return state;
        const updated = { ...state.user, ...partial };
        localStorage.setItem('binge_user', JSON.stringify(updated));
        return { user: updated };
      });
    }
  };
});
