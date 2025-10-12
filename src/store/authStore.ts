import { create } from 'zustand';
import type { AuthUser } from '../api/authApi';
import { buildGoogleLoginUrl, fetchCurrentUser, logoutRequest } from '../api/authApi';
import type { TraderType } from '../data/portfolioTypes';
import { usePortfolioStore } from './portfolioStore';
import { usePreferencesStore } from './preferencesStore';

interface AuthState {
  user: AuthUser | null;
  checking: boolean;
  error: string | null;
  hasChecked: boolean;
  getLoginUrl: () => string;
  bootstrap: () => Promise<void>;
  refetch: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  setTraderType: (type: TraderType) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  checking: false,
  error: null,
  hasChecked: false,
  getLoginUrl: () => buildGoogleLoginUrl(),
  bootstrap: async () => {
    if (get().checking || get().hasChecked) return;
    set({ checking: true, error: null });
    await get().refetch();
  },
  refetch: async () => {
    set({ checking: true, error: null });
    try {
      const user = await fetchCurrentUser();
      set({ user, checking: false, hasChecked: true });
      if (user) {
        void usePreferencesStore.getState().loadPreferences();
      } else {
        usePreferencesStore.getState().reset();
      }
      return user;
    } catch (error) {
      console.error('Failed to fetch current user', error);
      set({ user: null, checking: false, hasChecked: true, error: error instanceof Error ? error.message : 'Unknown error' });
      usePreferencesStore.getState().reset();
      return null;
    }
  },
  logout: async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.error('Failed to logout', error);
      // continue even if request fails to avoid blocking UI
    }
    usePortfolioStore.getState().logout();
    usePreferencesStore.getState().reset();
    set({ user: null, error: null, hasChecked: true, checking: false });
  },
  setTraderType: (type) => {
    set((state) => (state.user ? { user: { ...state.user, traderType: type } } : {}));
  }
}));
