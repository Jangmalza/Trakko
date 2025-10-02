import type { SupportedCurrency } from '../types/preferences';

export interface TradeEntry {
  id: string;
  ticker: string;
  profitLoss: number;
  rationale: string;
  tradeDate: string;
  createdAt: string;
  currency?: SupportedCurrency;
}

export interface NewTradeEntry {
  ticker: string;
  profitLoss: number;
  rationale: string;
  tradeDate: string;
}

export interface PortfolioSnapshot {
  initialSeed: number | null;
  trades: TradeEntry[];
  baseCurrency: SupportedCurrency;
  displayCurrency: SupportedCurrency;
  exchangeRate?: number;
}
