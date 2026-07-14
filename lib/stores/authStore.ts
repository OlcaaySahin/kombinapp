import { create } from 'zustand';

type AuthState = {
  userId: string | null;
  isReady: boolean;
  setSession: (userId: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  isReady: false,
  setSession: (userId) => set({ userId, isReady: true }),
}));
