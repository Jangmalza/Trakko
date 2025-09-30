import { create } from 'zustand';
import type { NewTradeEntry, TradeEntry } from '../data/portfolioTypes';
import { createTradeEntry, fetchPortfolio, resetPortfolio, upsertInitialSeed } from '../api/portfolioApi';

interface PortfolioState {
  initialSeed: number | null;
  trades: TradeEntry[];
  loading: boolean;
  error: string | null;
  hasLoaded: boolean;

  loadPortfolio: () => Promise<void>;
  setInitialSeed: (seed: number) => Promise<void>;
  addTrade: (payload: NewTradeEntry) => Promise<void>;
  resetData: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  initialSeed: null,
  trades: [],
  loading: false,
  error: null,
  hasLoaded: false,

  loadPortfolio: async () => {
    set({ loading: true, error: null });
    try {
      const snapshot = await fetchPortfolio();
      set({
        initialSeed: snapshot.initialSeed,
        trades: snapshot.trades,
        loading: false,
        hasLoaded: true
      });
    } catch (error) {
      console.error('Failed to load portfolio', error);
      const isUnauthorized = error instanceof Error && error.message === 'Unauthorized';
      set({
        initialSeed: null,
        trades: [],
        loading: false,
        error: isUnauthorized ? null : error instanceof Error ? error.message : 'Unknown error',
        hasLoaded: true
      });
    }
  },

  setInitialSeed: async (seed: number) => {
    set({ loading: true, error: null });
    try {
      const snapshot = await upsertInitialSeed(seed);
      set({
        initialSeed: snapshot.initialSeed,
        trades: snapshot.trades,
        loading: false,
        hasLoaded: true
      });
    } catch (error) {
      console.error('Failed to set initial seed', error);
      set({ loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  },

  addTrade: async (payload: NewTradeEntry) => {
    set({ loading: true, error: null });
    try {
      const trade = await createTradeEntry(payload);
      set((state) => ({
        trades: [...state.trades, trade].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate)),
        loading: false
      }));
    } catch (error) {
      console.error('Failed to add trade', error);
      set({ loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  },

  resetData: async () => {
    set({ loading: true, error: null });
    try {
      await resetPortfolio();
      set({
        initialSeed: null,
        trades: [],
        loading: false,
        hasLoaded: true
      });
    } catch (error) {
      console.error('Failed to reset portfolio', error);
      set({ loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  },

  logout: () => {
    set({
      initialSeed: null,
      trades: [],
      loading: false,
      error: null,
      hasLoaded: false
    });
  },

  clearError: () => {
    set({ error: null });
  }
}));
