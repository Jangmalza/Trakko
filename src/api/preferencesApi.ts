import type { SupportedCurrency, UserPreferences } from '../types/preferences';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const PREFERENCES_ENDPOINT = API_BASE_URL.replace(/\/$/, '') + '/preferences';

const buildError = async (response: Response) => {
  const message = await response.text();
  const error = new Error(message || `Preferences request failed (${response.status})`);
  (error as Error & { status?: number }).status = response.status;
  return error;
};

export async function fetchPreferences(): Promise<UserPreferences> {
  const response = await fetch(PREFERENCES_ENDPOINT, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return response.json() as Promise<UserPreferences>;
}

interface UpdatePreferencesPayload {
  currency: SupportedCurrency;
}

export async function updatePreferences(payload: UpdatePreferencesPayload): Promise<UserPreferences> {
  const response = await fetch(PREFERENCES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return response.json() as Promise<UserPreferences>;
}
