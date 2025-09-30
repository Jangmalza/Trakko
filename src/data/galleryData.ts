export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  description?: string;
  tags?: string[];
  width: number;
  height: number;
  photographer?: string;
  location?: string;
  createdAt?: string;
}

export interface NewGalleryImage {
  url: string;
  title: string;
  description?: string;
  tags?: string[];
  photographer?: string;
  location?: string;
  width?: number;
  height?: number;
}
