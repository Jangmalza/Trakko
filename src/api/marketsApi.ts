export interface MarketQuote {
  id: string;
  label: string;
  price: number | null;
  changePercent: number | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

const buildError = async (response: Response) => {
  const message = await response.text();
  const error = new Error(message || `Market request failed (${response.status})`);
  (error as Error & { status?: number }).status = response.status;
  return error;
};

export async function fetchMarketQuotes(): Promise<MarketQuote[]> {
  const response = await fetch(`${API_BASE_URL}/markets/indices`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return response.json() as Promise<MarketQuote[]>;
}
