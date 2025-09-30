import React, { useState, useRef, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import type { GalleryImage } from '../data/galleryData';
import { downloadImage } from '../utils/downloadImage';

interface GalleryGridProps {
  images: GalleryImage[];
  loading: boolean;
}

const generateSrcSet = (url: string) => {
  const isRemote = /^https?:\/\//i.test(url);
  if (!isRemote) return '';

  try {
    const parsed = new URL(url);
    parsed.search = '';
    const cleanUrl = parsed.toString();

    const widths = [480, 720, 960, 1200];
    return widths
      .map(width => `${cleanUrl}?w=${width}&fit=crop&q=80&fm=webp ${width}w`)
      .join(', ');
  } catch {
    return '';
  }
};

const GalleryGrid: React.FC<GalleryGridProps> = ({ images, loading }) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<GalleryImage | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeModal = () => {
    setActiveImage(null);
    document.body.style.overflow = '';
  };

  useEffect(() => {
    if (!activeImage) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [activeImage]);

  useEffect(() => {
    if (activeImage && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [activeImage]);

  const handleDownload = async (image: GalleryImage) => {
    setDownloadingId(image.id);
    try {
      await downloadImage(image.url, `${image.title.replace(/\s+/g, '_')}_${image.id}`);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const columns = {
    default: 2,
    1024: 2,
    768: 1,
  };

  return (
    <section className="bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Masonry
          breakpointCols={columns}
          className="my-masonry-grid gap-4"
          columnClassName="my-masonry-grid_column"
        >
          {images.map(image => {
            const srcSet = generateSrcSet(image.url);

            return (
              <figure
                key={image.id}
                className="group overflow-hidden rounded border border-gray-200 bg-white transition hover:shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setActiveImage(image)}
                  className="block w-full text-left"
                >
                  <img
                    src={image.url}
                    srcSet={srcSet || undefined}
                    sizes={srcSet ? '(max-width: 768px) 100vw, 50vw' : undefined}
                    alt={image.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
                <figcaption className="space-y-1 border-t border-gray-100 px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{image.title}</div>
                  {image.photographer && (
                    <div className="text-xs text-gray-500">{image.photographer}</div>
                  )}
                  {image.tags && (
                    <ul className="flex flex-wrap gap-2 pt-2">
                      {image.tags.map(tag => (
                        <li key={tag} className="rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-600">
                          #{tag}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownload(image)}
                    className="text-xs text-gray-500 underline-offset-2 hover:underline"
                    disabled={downloadingId === image.id}
                  >
                    {downloadingId === image.id ? 'Downloading...' : 'Download'}
                  </button>
                </figcaption>
              </figure>
            );
          })}
        </Masonry>

        {loading && (
          <div className="mt-12 text-center text-sm text-gray-500">Loading images...</div>
        )}

        {!loading && images.length === 0 && (
          <div className="mt-20 text-center text-sm text-gray-500">There are no images to display.</div>
        )}
      </div>

      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
              closeModal();
            }
          }}
        >
          <div ref={modalRef} className="max-h-[90vh] max-w-3xl overflow-hidden rounded bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{activeImage.title}</h2>
                {activeImage.location && (
                  <p className="text-xs text-gray-500">{activeImage.location}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(activeImage)}
                  className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  disabled={downloadingId === activeImage.id}
                >
                  {downloadingId === activeImage.id ? 'Downloading...' : 'Download'}
                </button>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeModal}
                  className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
            <img
              src={activeImage.url}
              alt={activeImage.title}
              className="h-auto max-h-[65vh] w-full object-contain"
              loading="lazy"
            />
            {activeImage.description && (
              <p className="border-t border-gray-100 px-6 py-4 text-sm text-gray-600">
                {activeImage.description}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default GalleryGrid;
