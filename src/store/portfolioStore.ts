import { create } from 'zustand';
import type { NewTradeEntry, TradeEntry, PerformanceGoalSummary, UpsertGoalPayload, TraderType, GoalPeriod } from '../data/portfolioTypes';
import { createTradeEntry, fetchPortfolio, resetPortfolio, upsertInitialSeed, updateTradeEntry, deleteTradeEntry } from '../api/portfolioApi';
import { fetchCurrentGoal, upsertCurrentGoal, deleteCurrentGoal } from '../api/goalsApi';
import { usePreferencesStore } from './preferencesStore';
import type { SupportedCurrency } from '../types/preferences';

interface PortfolioState {
  initialSeed: number | null;
  trades: TradeEntry[];
  baseCurrency: SupportedCurrency;
  displayCurrency: SupportedCurrency;
  exchangeRate: number | null;
  performanceGoal: PerformanceGoalSummary | null;
  loading: boolean;
  error: string | null;
  hasLoaded: boolean;
  goalLoading: boolean;
  goalError: string | null;
  traderType: TraderType;

  loadPortfolio: () => Promise<void>;
  setInitialSeed: (seed: number, traderType: TraderType) => Promise<void>;
  addTrade: (payload: NewTradeEntry) => Promise<void>;
  updateTrade: (tradeId: string, payload: NewTradeEntry) => Promise<void>;
  deleteTrade: (tradeId: string) => Promise<void>;
  resetData: () => Promise<void>;
  refreshPerformanceGoal: () => Promise<void>;
  upsertGoal: (payload: UpsertGoalPayload) => Promise<void>;
  deleteGoal: (options?: { period?: GoalPeriod; year?: number; month?: number }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setTraderTypeLocal: (type: TraderType) => void;
}

const BASE_CURRENCY_DEFAULT: SupportedCurrency = 'KRW';

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  initialSeed: null,
  trades: [],
  baseCurrency: BASE_CURRENCY_DEFAULT,
  displayCurrency: usePreferencesStore.getState().currency,
  exchangeRate: null,
  performanceGoal: null,
  loading: false,
  error: null,
  hasLoaded: false,
  goalLoading: false,
  goalError: null,
  traderType: 'KR_STOCK',

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
        performanceGoal: snapshot.performanceGoal ?? null,
        loading: false,
        hasLoaded: true,
        error: null,
        traderType: snapshot.traderType
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

  setInitialSeed: async (seed: number, traderType: TraderType) => {
    set({ loading: true, error: null });
    try {
      const currency = usePreferencesStore.getState().currency;
      const snapshot = await upsertInitialSeed(seed, currency, traderType);
      set({
        initialSeed: snapshot.initialSeed,
        trades: snapshot.trades,
        baseCurrency: snapshot.baseCurrency,
        displayCurrency: snapshot.displayCurrency,
        exchangeRate: snapshot.exchangeRate ?? null,
        performanceGoal: snapshot.performanceGoal ?? null,
        loading: false,
        hasLoaded: true,
        error: null,
        traderType: snapshot.traderType
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
        const updatedTrades = [...state.trades, trade].sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
        return {
          trades: updatedTrades,
          loading: false,
          hasLoaded: true,
          error: null
        };
      });
      await get().refreshPerformanceGoal();
    } catch (error) {
      console.error('Failed to add trade', error);
      set({ loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  },

  updateTrade: async (tradeId: string, payload: NewTradeEntry) => {
    set({ loading: true, error: null });
    try {
      const currency = usePreferencesStore.getState().currency;
      const updated = await updateTradeEntry(tradeId, { ...payload, currency });
      set((state) => {
        const updatedTrades = state.trades
          .map((trade) => (trade.id === tradeId ? updated : trade))
          .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
        return {
          trades: updatedTrades,
          loading: false,
          hasLoaded: true,
          error: null
        };
      });
      await get().refreshPerformanceGoal();
    } catch (error) {
      console.error('Failed to update trade', error);
      set({ loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  },

  deleteTrade: async (tradeId: string) => {
    set({ loading: true, error: null });
    try {
      await deleteTradeEntry(tradeId);
      set((state) => ({
        trades: state.trades.filter((trade) => trade.id !== tradeId),
        loading: false,
        hasLoaded: true,
        error: null
      }));
      await get().refreshPerformanceGoal();
    } catch (error) {
      console.error('Failed to delete trade', error);
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
        performanceGoal: snapshot.performanceGoal ?? null,
        loading: false,
        hasLoaded: true,
        error: null,
        traderType: snapshot.traderType
      });
    } catch (error) {
      console.error('Failed to reset portfolio', error);
      set({ loading: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  },

  refreshPerformanceGoal: async () => {
    set({ goalLoading: true, goalError: null });
    try {
      const summary = await fetchCurrentGoal();
      set({ performanceGoal: summary ?? null, goalLoading: false });
    } catch (error) {
      console.error('Failed to refresh performance goal', error);
      set({
        goalLoading: false,
        goalError: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  upsertGoal: async (payload: UpsertGoalPayload) => {
    set({ goalLoading: true, goalError: null });
    try {
      const summary = await upsertCurrentGoal(payload);
      set({ performanceGoal: summary ?? null, goalLoading: false, error: null });
    } catch (error) {
      console.error('Failed to upsert performance goal', error);
      set({
        goalLoading: false,
        goalError: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },

  deleteGoal: async (options) => {
    set({ goalLoading: true, goalError: null });
    try {
      const summary = await deleteCurrentGoal(options ?? {});
      set({ performanceGoal: summary ?? null, goalLoading: false, error: null });
    } catch (error) {
      console.error('Failed to delete performance goal', error);
      set({
        goalLoading: false,
        goalError: error instanceof Error ? error.message : 'Unknown error'
      });
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
      performanceGoal: null,
      loading: false,
      error: null,
      hasLoaded: false,
      goalLoading: false,
      goalError: null,
      traderType: 'KR_STOCK'
    });
  },

  clearError: () => {
    set({ error: null, goalError: null });
  },

  setTraderTypeLocal: (type: TraderType) => {
    set({ traderType: type });
  }
}));
