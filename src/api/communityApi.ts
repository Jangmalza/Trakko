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
  imageUrl?: string | null;
  author: CommunityPostAuthor | null;
  commentCount?: number;
}

export interface CreateCommunityPostPayload {
  title: string;
  content: string;
  image?: File | null;
}

export interface UpdateCommunityPostPayload {
  title: string;
  content: string;
  image?: File | null;
  removeImage?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';
const API_ORIGIN = (() => {
  try {
    const url = new URL(API_BASE_URL);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'http://localhost:4000';
  }
})();

export const resolveCommunityImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) {
    return null;
  }

  try {
    const absolute = new URL(imagePath);
    return absolute.toString();
  } catch {
    // not an absolute URL
  }

  const normalized = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${API_ORIGIN}${normalized}`;
};

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
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('content', payload.content);
  if (payload.image instanceof File) {
    formData.append('image', payload.image);
  }

  const response = await fetch(`${API_BASE_URL}/community/posts`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '게시글을 등록하지 못했습니다.');
  }

  return response.json() as Promise<CommunityPost>;
}

export async function fetchCommunityPost(postId: string): Promise<CommunityPost> {
  const response = await fetch(`${API_BASE_URL}/community/posts/${postId}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '게시글을 불러오지 못했습니다.');
  }

  return response.json() as Promise<CommunityPost>;
}

export async function updateCommunityPost(postId: string, payload: UpdateCommunityPostPayload): Promise<CommunityPost> {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('content', payload.content);
  if (payload.image instanceof File) {
    formData.append('image', payload.image);
  }
  if (payload.removeImage) {
    formData.append('removeImage', 'true');
  }

  const response = await fetch(`${API_BASE_URL}/community/posts/${postId}`, {
    method: 'PATCH',
    credentials: 'include',
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '게시글을 수정하지 못했습니다.');
  }

  return response.json() as Promise<CommunityPost>;
}

export async function deleteCommunityPost(postId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/community/posts/${postId}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  if (!response.ok && response.status !== 204) {
    const message = await response.text();
    throw new Error(message || '게시글을 삭제하지 못했습니다.');
  }
}
