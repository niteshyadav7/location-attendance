import { create } from 'zustand';
import { UserProfile } from '../types';

interface AuthState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  loading: true,
  setLoading: (loading) => set({ loading }),
}));
