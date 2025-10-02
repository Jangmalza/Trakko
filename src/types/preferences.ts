export type SupportedCurrency = 'USD' | 'KRW';

export interface UserPreferences {
  currency: SupportedCurrency;
  locale: string;
}
