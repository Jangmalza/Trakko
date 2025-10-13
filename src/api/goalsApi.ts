import type { GoalPeriod, PerformanceGoalSummary, UpsertGoalPayload } from '../data/portfolioTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const GOAL_ENDPOINT = API_BASE_URL.replace(/\/$/, '') + '/goals/current';

const parseGoalResponse = async (response: Response): Promise<PerformanceGoalSummary | null> => {
  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Performance goal request failed (${response.status})`);
  }

  return response.json() as Promise<PerformanceGoalSummary | null>;
};

export async function fetchCurrentGoal(): Promise<PerformanceGoalSummary | null> {
  const response = await fetch(GOAL_ENDPOINT, {
    credentials: 'include'
  });

  return parseGoalResponse(response);
}

export async function upsertCurrentGoal(payload: UpsertGoalPayload): Promise<PerformanceGoalSummary | null> {
  const response = await fetch(GOAL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      ...payload,
      period: (payload.period ?? 'MONTHLY').toUpperCase()
    })
  });

  return parseGoalResponse(response);
}

interface DeleteGoalOptions {
  period?: GoalPeriod;
  year?: number;
  month?: number;
}

export async function deleteCurrentGoal(options: DeleteGoalOptions = {}): Promise<PerformanceGoalSummary | null> {
  const url = new URL(GOAL_ENDPOINT);
  if (options.period) {
    url.searchParams.set('period', options.period);
  }
  if (typeof options.year === 'number') {
    url.searchParams.set('year', String(options.year));
  }
  if (typeof options.month === 'number') {
    url.searchParams.set('month', String(options.month));
  }

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    credentials: 'include'
  });

  return parseGoalResponse(response);
}
