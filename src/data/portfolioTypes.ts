import type { SupportedCurrency } from '../types/preferences';

export type TraderType = 'CRYPTO' | 'US_STOCK' | 'KR_STOCK';

export interface TradeEntry {
  id: string;
  ticker: string;
  profitLoss: number;
  rationale?: string | null;
  entryRationale?: string | null;
  exitRationale?: string | null;
  tradeDate: string;
  createdAt: string;
  currency?: SupportedCurrency;
}

export interface NewTradeEntry {
  ticker: string;
  profitLoss: number;
  tradeDate: string;
  rationale?: string;
  entryRationale?: string;
  exitRationale?: string;
}

export type GoalPeriod = 'MONTHLY' | 'ANNUAL';

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
  monthly: GoalProgressSummary;
  annual: GoalProgressSummary;
}

export interface GoalProgressSummary {
  period: GoalPeriod;
  goal: GoalProgressDetail | null;
  achievedAmount: number;
  remainingAmount: number | null;
  progressPercent: number | null;
  timeFrame: {
    year: number;
    month: number | null;
    label: string;
  };
}

export interface GoalProgressDetail {
  id: string;
  targetAmount: number;
  currency: SupportedCurrency;
  targetYear: number;
  targetMonth: number | null;
  period: GoalPeriod;
}

export interface UpsertGoalPayload {
  targetAmount: number;
  currency: SupportedCurrency;
  year?: number;
  month?: number;
  period?: GoalPeriod;
}
