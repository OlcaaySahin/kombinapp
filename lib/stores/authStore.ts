import { create } from 'zustand';

type SessionInfo = {
  userId: string | null;
  isAnonymous: boolean;
  email: string | null;
};

type AuthState = SessionInfo & {
  isReady: boolean;
  setSession: (session: SessionInfo) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  isAnonymous: true,
  email: null,
  isReady: false,
  setSession: (session) => set({ ...session, isReady: true }),
}));
