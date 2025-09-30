export interface TradeEntry {
  id: string;
  ticker: string;
  profitLoss: number;
  rationale: string;
  tradeDate: string;
  createdAt: string;
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
}