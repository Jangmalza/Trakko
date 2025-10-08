export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface AnnouncementAuthor {
  id: string;
  displayName: string;
  email: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  status: AnnouncementStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: AnnouncementAuthor | null;
}

export interface AnnouncementInput {
  title: string;
  content: string;
  status: AnnouncementStatus;
  publishedAt: string | null;
  expiresAt: string | null;
}
