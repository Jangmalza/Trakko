import type { TraderType } from '../data/portfolioTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

const buildError = async (response: Response) => {
  const message = await response.text();
  const error = new Error(message || `Profile request failed (${response.status})`);
  (error as Error & { status?: number }).status = response.status;
  return error;
};

export async function updateTraderType(traderType: TraderType): Promise<TraderType> {
  const response = await fetch(`${API_BASE_URL}/profile/trader-type`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ traderType })
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  const data = (await response.json()) as { traderType: TraderType };
  return data.traderType;
}
