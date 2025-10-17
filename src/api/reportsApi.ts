const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const REPORT_ENDPOINT = API_BASE_URL.replace(/\/$/, '') + '/reports/performance';

export type ReportGranularity = 'DAILY' | 'MONTHLY' | 'YEARLY';

export interface ReportRequestOptions {
  granularity?: ReportGranularity;
  startDate?: string;
  endDate?: string;
}

const extractErrorMessage = async (response: Response) => {
  try {
    const data = await response.clone().json();
    if (data && typeof data === 'object' && 'message' in data) {
      return String((data as { message?: unknown }).message || '');
    }
  } catch {
    // ignore and fall through
  }
  const text = await response.text();
  return text || `Report request failed (${response.status})`;
};

export async function requestPerformanceReport(options: ReportRequestOptions = {}): Promise<Blob> {
  const response = await fetch(REPORT_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/pdf',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(options)
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return await response.blob();
}
