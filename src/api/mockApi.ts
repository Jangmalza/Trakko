import type { GalleryImage, NewGalleryImage } from '../data/galleryData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export interface PaginatedImagesResponse {
  images: GalleryImage[];
  hasMore: boolean;
  total: number;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchImages(
  page: number = 1,
  limit: number = 8
): Promise<PaginatedImagesResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });

  const response = await fetch(`${API_BASE_URL}/images?${params.toString()}`);
  return handleResponse<PaginatedImagesResponse>(response);
}

export async function fetchAdminImages(): Promise<GalleryImage[]> {
  const response = await fetch(`${API_BASE_URL}/admin/images`);
  const data = await handleResponse<{ images: GalleryImage[] }>(response);
  return data.images;
}

export async function createImage(newImage: NewGalleryImage): Promise<GalleryImage> {
  const response = await fetch(`${API_BASE_URL}/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newImage)
  });

  return handleResponse<GalleryImage>(response);
}

export async function deleteImage(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/images/${id}`, {
    method: 'DELETE'
  });

  if (!response.ok && response.status !== 204) {
    const message = await response.text();
    throw new Error(message || `Failed to delete image (${response.status})`);
  }
}
