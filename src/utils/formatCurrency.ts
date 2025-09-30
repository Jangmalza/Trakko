import { APP_CURRENCY, APP_LOCALE } from '../config/appConfig';

const formatter = new Intl.NumberFormat(APP_LOCALE, {
  style: 'currency',
  currency: APP_CURRENCY,
  maximumFractionDigits: 0
});

export const formatCurrency = (value: number) => {
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