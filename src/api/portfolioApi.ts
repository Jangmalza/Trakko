import type { NewTradeEntry, PortfolioSnapshot, TradeEntry } from '../data/portfolioTypes';
import type { SupportedCurrency } from '../types/preferences';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

async function getErrorMessage(response: Response): Promise<string> {
  let text = '';
  try {
    text = await response.text();
  } catch (readError) {
    console.warn('응답 본문을 읽지 못했습니다.', readError);
  }

  if (!text) {
    return `요청이 실패했습니다. (상태 코드: ${response.status})`;
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && 'message' in (parsed as Record<string, unknown>)) {
      return String((parsed as Record<string, unknown>).message);
    }
  } catch {
    // ignore JSON parse errors
  }

  return text;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await getErrorMessage(response);
    throw new Error(message);
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

interface UpdateTradePayload extends NewTradeEntry {
  currency: SupportedCurrency;
}

export async function updateTradeEntry(tradeId: string, payload: UpdateTradePayload): Promise<TradeEntry> {
  const response = await fetch(`${API_BASE_URL}/portfolio/trades/${tradeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });

  return handleResponse<TradeEntry>(response);
}

export async function deleteTradeEntry(tradeId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/portfolio/trades/${tradeId}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok && response.status !== 204) {
    const message = await getErrorMessage(response);
    throw new Error(message || `거래 삭제에 실패했습니다. (상태 코드: ${response.status})`);
  }
}

export async function resetPortfolio(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/portfolio/reset`, {
    method: 'POST',
    credentials: 'include'
  });

  if (!response.ok && response.status !== 204) {
    const message = await getErrorMessage(response);
    throw new Error(message || `포트폴리오 초기화에 실패했습니다. (상태 코드: ${response.status})`);
  }
}
