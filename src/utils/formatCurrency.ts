import { usePreferencesStore } from '../store/preferencesStore';
import { APP_CURRENCY, APP_LOCALE } from '../config/appConfig';

const formatterCache = new Map<string, Intl.NumberFormat>();

const resolveFormatOptions = () => {
  const state = usePreferencesStore.getState();
  const fallbackCurrency = typeof APP_CURRENCY === 'string' ? APP_CURRENCY.toUpperCase() : 'USD';
  const currency = state.currency ?? fallbackCurrency;
  const locale = state.locale ?? (typeof APP_LOCALE === 'string' && APP_LOCALE.length > 0 ? APP_LOCALE : 'en-US');

  return {
    currency: currency as Intl.NumberFormatOptions['currency'],
    locale
  };
};

const getFormatter = () => {
  const { currency, locale } = resolveFormatOptions();
  const key = `${locale}-${currency}`;

  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'KRW' ? 0 : 2
      })
    );
  }

  return formatterCache.get(key)!;
};

export const formatCurrency = (value: number) => {
  const formatter = getFormatter();
  if (!Number.isFinite(value)) {
    return formatter.format(0);
  }
  return formatter.format(value);
};

export const formatSignedCurrency = (value: number) => {
  const formatted = formatCurrency(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};
