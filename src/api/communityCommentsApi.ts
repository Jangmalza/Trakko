import type { AuthUserSubscription } from './authApi';

export interface CommunityCommentAuthor {
  id: string;
  displayName: string | null;
  email: string | null;
  subscriptionTier: AuthUserSubscription;
}

export interface CommunityComment {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: CommunityCommentAuthor | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export async function fetchComments(postId: string): Promise<CommunityComment[]> {
  const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/comments`, {
    credentials: 'include'
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '댓글을 불러오지 못했습니다.');
  }

  return response.json() as Promise<CommunityComment[]>;
}

export async function createComment(postId: string, content: string): Promise<CommunityComment> {
  const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '댓글을 등록하지 못했습니다.');
  }

  return response.json() as Promise<CommunityComment>;
}
