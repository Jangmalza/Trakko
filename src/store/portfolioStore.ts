import { create } from 'zustand';
import type { NewTradeEntry, TradeEntry } from '../data/portfolioTypes';
import { createTradeEntry, fetchPortfolio, resetPortfolio, upsertInitialSeed } from '../api/portfolioApi';

const STORAGE_KEY = 'trakko_portfolio_cache';

interface PersistedPortfolio {
  initialSeed: number | null;
  trades: TradeEntry[];
}

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

const readPersistedPortfolio = (): PersistedPortfolio | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedPortfolio;
    if (!('trades' in parsed)) return null;
    return parsed;
  } catch (error) {
    console.warn('Failed to read cached portfolio', error);
    return null;
  }
};

const persistPortfolio = (initialSeed: number | null, trades: TradeEntry[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ initialSeed, trades })
    );
  } catch (error) {
    console.warn('Failed to persist portfolio cache', error);
  }
};

const cached = readPersistedPortfolio();

export const usePortfolioStore = create<PortfolioState>((set) => ({
  initialSeed: cached?.initialSeed ?? null,
  trades: cached?.trades ?? [],
  loading: false,
  error: null,
  hasLoaded: Boolean(cached),

  loadPortfolio: async () => {
    set({ loading: true, error: null });
    try {
      const snapshot = await fetchPortfolio();
      set(() => {
        persistPortfolio(snapshot.initialSeed, snapshot.trades);
        return {
          initialSeed: snapshot.initialSeed,
          trades: snapshot.trades,
          loading: false,
          hasLoaded: true,
          error: null
        };
      });
    } catch (error) {
      console.error('Failed to load portfolio', error);
      set((state) => ({
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasLoaded: state.hasLoaded || Boolean(state.initialSeed !== null || state.trades.length > 0)
      }));
    }
  },

  setInitialSeed: async (seed: number) => {
    set({ loading: true, error: null });
    try {
      const snapshot = await upsertInitialSeed(seed);
      set(() => {
        persistPortfolio(snapshot.initialSeed, snapshot.trades);
        return {
          initialSeed: snapshot.initialSeed,
          trades: snapshot.trades,
          loading: false,
          hasLoaded: true,
          error: null
        };
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
      set((state) => {
        const updatedTrades = [...state.trades, trade].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
        persistPortfolio(state.initialSeed, updatedTrades);
        return {
          trades: updatedTrades,
          loading: false
        };
      });
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
      set(() => {
        persistPortfolio(null, []);
        return {
          initialSeed: null,
          trades: [],
          loading: false,
          hasLoaded: true
        };
      });
    } catch (error) {
      console.error('Failed to reset portfolio', error);
      set({ loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  },

  logout: () => {
    set((state) => {
      persistPortfolio(state.initialSeed, state.trades);
      return {
        loading: false,
        error: null,
        hasLoaded: false
      };
    });
  },

  clearError: () => {
    set({ error: null });
  }
}));
