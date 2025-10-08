export type AuthUserRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  displayName: string;
  email?: string;
  role: AuthUserRole;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export function buildGoogleLoginUrl() {
  const base = API_BASE_URL.replace(/\/$/, '');
  const redirect = encodeURIComponent(`${window.location.origin}/auth/callback`);
  return `${base}/auth/google?redirect=${redirect}`;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: 'include'
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to fetch user (${response.status})`);
  }

  return response.json() as Promise<AuthUser>;
}

export async function logoutRequest(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });

  if (!response.ok && response.status !== 204) {
    const message = await response.text();
    throw new Error(message || `Failed to logout (${response.status})`);
  }
}
