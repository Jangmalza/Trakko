import { create } from 'zustand';
import { APP_CURRENCY, APP_LOCALE } from '../config/appConfig';
import { fetchPreferences, updatePreferences } from '../api/preferencesApi';
import type { SupportedCurrency } from '../types/preferences';

const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['USD', 'KRW'];

const currencyLocales: Record<SupportedCurrency, string> = {
  USD: 'en-US',
  KRW: 'ko-KR'
};

const normalizeCurrency = (value: unknown): SupportedCurrency => {
  if (typeof value !== 'string') return 'KRW';
  const upper = value.toUpperCase() as SupportedCurrency;
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper) ? upper : 'KRW';
};

const envCurrency = normalizeCurrency(typeof APP_CURRENCY === 'string' ? APP_CURRENCY : 'USD');
const envLocale = typeof APP_LOCALE === 'string' && APP_LOCALE.length > 0
  ? APP_LOCALE
  : currencyLocales[envCurrency];

interface PreferencesState {
  currency: SupportedCurrency;
  locale: string;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  loadPreferences: () => Promise<void>;
  updateCurrency: (currency: SupportedCurrency) => Promise<void>;
  reset: () => void;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  currency: envCurrency,
  locale: envLocale,
  loading: false,
  initialized: false,
  error: null,
  loadPreferences: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const prefs = await fetchPreferences();
      const currency = normalizeCurrency(prefs?.currency ?? envCurrency);
      const locale = typeof prefs?.locale === 'string' && prefs.locale.length > 0
        ? prefs.locale
        : currencyLocales[currency];

      set({ currency, locale, loading: false, initialized: true, error: null });
    } catch (error) {
      const status = (error as { status?: number } | undefined)?.status;
      if (status === 401) {
        set({ currency: envCurrency, locale: envLocale, loading: false, initialized: true, error: null });
        return;
      }

      const message = error instanceof Error ? error.message : '환경 설정을 불러오지 못했습니다.';
      set({ loading: false, initialized: true, error: message, currency: envCurrency, locale: envLocale });
    }
  },
  updateCurrency: async (nextCurrency) => {
    const current = get();
    if (current.currency === nextCurrency) return;

    const previous = { currency: current.currency, locale: current.locale };
    const nextLocale = currencyLocales[nextCurrency] ?? currencyLocales.USD;
    set({ currency: nextCurrency, locale: nextLocale, error: null, loading: true });

    try {
      const prefs = await updatePreferences({ currency: nextCurrency });
      const normalizedCurrency = normalizeCurrency(prefs?.currency ?? nextCurrency);
      const normalizedLocale = typeof prefs?.locale === 'string' && prefs.locale.length > 0
        ? prefs.locale
        : currencyLocales[normalizedCurrency];

      set({ currency: normalizedCurrency, locale: normalizedLocale, loading: false, initialized: true, error: null });

      try {
        const { usePortfolioStore } = await import('./portfolioStore');
        await usePortfolioStore.getState().loadPortfolio();
      } catch (reloadError) {
        console.warn('Failed to reload portfolio after currency update', reloadError);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '통화를 변경하지 못했습니다.';
      set({ currency: previous.currency, locale: previous.locale, loading: false, error: message });
      throw error;
    }
  },
  reset: () => {
    set({ currency: envCurrency, locale: envLocale, loading: false, initialized: false, error: null });
  }
}));
