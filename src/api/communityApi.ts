import type { AuthUserSubscription } from './authApi';

export interface CommunityPostAuthor {
  id: string;
  displayName: string | null;
  email: string | null;
  subscriptionTier: AuthUserSubscription;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: CommunityPostAuthor | null;
}

export interface CreateCommunityPostPayload {
  title: string;
  content: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
  const response = await fetch(`${API_BASE_URL}/community/posts`, {
    credentials: 'include'
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '커뮤니티 게시글을 불러오지 못했습니다.');
  }

  return response.json() as Promise<CommunityPost[]>;
}

export async function createCommunityPost(payload: CreateCommunityPostPayload): Promise<CommunityPost> {
  const response = await fetch(`${API_BASE_URL}/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '게시글을 등록하지 못했습니다.');
  }

  return response.json() as Promise<CommunityPost>;
}
