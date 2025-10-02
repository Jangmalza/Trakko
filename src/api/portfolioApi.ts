import type { NewTradeEntry, PortfolioSnapshot, TradeEntry } from '../data/portfolioTypes';
import type { SupportedCurrency } from '../types/preferences';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchPortfolio(): Promise<PortfolioSnapshot> {
  const response = await fetch(`${API_BASE_URL}/portfolio`, {
    credentials: 'include'
  });

  return handleResponse<PortfolioSnapshot>(response);
}

export async function upsertInitialSeed(initialSeed: number, currency: SupportedCurrency): Promise<PortfolioSnapshot> {
  const response = await fetch(`${API_BASE_URL}/portfolio/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initialSeed, currency }),
    credentials: 'include'
  });

  return handleResponse<PortfolioSnapshot>(response);
}

interface CreateTradePayload extends NewTradeEntry {
  currency: SupportedCurrency;
}

export async function createTradeEntry(payload: CreateTradePayload): Promise<TradeEntry> {
  const response = await fetch(`${API_BASE_URL}/portfolio/trades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });

  return handleResponse<TradeEntry>(response);
}

export async function resetPortfolio(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/portfolio/reset`, {
    method: 'POST',
    credentials: 'include'
  });

  if (!response.ok && response.status !== 204) {
    const message = await response.text();
    throw new Error(message || `Failed to reset portfolio (${response.status})`);
  }
}
