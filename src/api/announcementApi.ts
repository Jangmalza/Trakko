import type { Announcement, AnnouncementInput } from '../types/announcement';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

function buildUrl(path: string, searchParams?: Record<string, string | undefined>) {
  const url = new URL(path, `${API_BASE_URL.replace(/\/$/, '')}/`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

export async function fetchAnnouncements(scope: 'public' | 'all' = 'public'): Promise<Announcement[]> {
  const url = buildUrl('announcements', scope === 'all' ? { scope: 'all' } : undefined);
  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to fetch announcements (${response.status})`);
  }

  return response.json() as Promise<Announcement[]>;
}

export async function fetchAnnouncement(id: string): Promise<Announcement> {
  const response = await fetch(buildUrl(`announcements/${id}`), { credentials: 'include' });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to fetch announcement (${response.status})`);
  }

  return response.json() as Promise<Announcement>;
}

export async function createAnnouncement(payload: AnnouncementInput): Promise<Announcement> {
  const response = await fetch(buildUrl('announcements'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to create announcement (${response.status})`);
  }

  return response.json() as Promise<Announcement>;
}

export async function updateAnnouncement(id: string, payload: Partial<AnnouncementInput>): Promise<Announcement> {
  const response = await fetch(buildUrl(`announcements/${id}`), {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to update announcement (${response.status})`);
  }

  return response.json() as Promise<Announcement>;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const response = await fetch(buildUrl(`announcements/${id}`), {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok && response.status !== 204) {
    const message = await response.text();
    throw new Error(message || `Failed to delete announcement (${response.status})`);
  }
}
