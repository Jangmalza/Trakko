import { create } from 'zustand';
import type { NewTradeEntry, TradeEntry } from '../data/portfolioTypes';
import { createTradeEntry, fetchPortfolio, resetPortfolio, upsertInitialSeed } from '../api/portfolioApi';
import { usePreferencesStore } from './preferencesStore';
import type { SupportedCurrency } from '../types/preferences';

interface PortfolioState {
  initialSeed: number | null;
  trades: TradeEntry[];
  baseCurrency: SupportedCurrency;
  displayCurrency: SupportedCurrency;
  exchangeRate: number | null;
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

const BASE_CURRENCY_DEFAULT: SupportedCurrency = 'KRW';

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  initialSeed: null,
  trades: [],
  baseCurrency: BASE_CURRENCY_DEFAULT,
  displayCurrency: usePreferencesStore.getState().currency,
  exchangeRate: null,
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
        baseCurrency: snapshot.baseCurrency,
        displayCurrency: snapshot.displayCurrency,
        exchangeRate: snapshot.exchangeRate ?? null,
        loading: false,
        hasLoaded: true,
        error: null
      });
    } catch (error) {
      console.error('Failed to load portfolio', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasLoaded: get().hasLoaded
      });
    }
  },

  setInitialSeed: async (seed: number) => {
    set({ loading: true, error: null });
    try {
      const currency = usePreferencesStore.getState().currency;
      const snapshot = await upsertInitialSeed(seed, currency);
      set({
        initialSeed: snapshot.initialSeed,
        trades: snapshot.trades,
        baseCurrency: snapshot.baseCurrency,
        displayCurrency: snapshot.displayCurrency,
        exchangeRate: snapshot.exchangeRate ?? null,
        loading: false,
        hasLoaded: true,
        error: null
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
      const currency = usePreferencesStore.getState().currency;
      const trade = await createTradeEntry({ ...payload, currency });
      set((state) => {
        const updatedTrades = [...state.trades, trade].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
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
      const snapshot = await fetchPortfolio();
      set({
        initialSeed: snapshot.initialSeed,
        trades: snapshot.trades,
        baseCurrency: snapshot.baseCurrency,
        displayCurrency: snapshot.displayCurrency,
        exchangeRate: snapshot.exchangeRate ?? null,
        loading: false,
        hasLoaded: true,
        error: null
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
      baseCurrency: BASE_CURRENCY_DEFAULT,
      displayCurrency: usePreferencesStore.getState().currency,
      exchangeRate: null,
      loading: false,
      error: null,
      hasLoaded: false
    });
  },

  clearError: () => {
    set({ error: null });
  }
}));
