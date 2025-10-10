import type { SupportedCurrency } from '../types/preferences';

export type TraderType = 'CRYPTO' | 'US_STOCK' | 'KR_STOCK';

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
  performanceGoal: PerformanceGoalSummary;
  traderType: TraderType;
}

export interface PerformanceGoalSummary {
  goal: {
    id: string;
    targetAmount: number;
    currency: SupportedCurrency;
    targetYear: number;
    targetMonth: number;
  } | null;
  achievedAmount: number;
  remainingAmount: number | null;
  progressPercent: number | null;
  month: {
    year: number;
    month: number;
    label: string;
  };
}

export interface UpsertGoalPayload {
  targetAmount: number;
  currency: SupportedCurrency;
  year?: number;
  month?: number;
}
