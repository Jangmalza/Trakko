import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryImage, NewGalleryImage } from '../data/galleryData';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

const AdminPage: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [form, setForm] = useState({
    url: '',
    title: '',
    description: '',
    photographer: '',
    location: '',
    tags: '',
    width: '',
    height: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImage = async (payload: NewGalleryImage) => {
    const response = await fetch(`${API_BASE}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  };

  const deleteImage = async (id: string) => {
    const response = await fetch(`${API_BASE}/images/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(await response.text());
    }
  };

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/images`);
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { images: GalleryImage[] };
      setImages(data.images);
      setError('');
    } catch {
      setError('Unable to load images. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({ url: '', title: '', description: '', photographer: '', location: '', tags: '', width: '', height: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAdd = async () => {
    if (!form.url.trim() || !form.title.trim()) {
      setError('Please provide both an image URL and title.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: NewGalleryImage = {
        url: form.url.trim(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        photographer: form.photographer.trim() || undefined,
        location: form.location.trim() || undefined,
        tags: form.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean),
        width: form.width ? Number(form.width) : undefined,
        height: form.height ? Number(form.height) : undefined
      };

      await addImage(payload);
      await loadImages();
      resetForm();
      setError('');
    } catch {
      setError('The image could not be saved. Please review the inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteImage(id);
      setImages(current => current.filter(image => image.id !== id));
    } catch {
      setError('We could not remove the image. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const importFromFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const dataUrl = reader.result;
      const preview = new Image();
      preview.onload = () => {
        setForm(prev => ({
          ...prev,
          width: prev.width || String(preview.width),
          height: prev.height || String(preview.height)
        }));
      };
      preview.src = dataUrl;

      setForm(prev => ({
        ...prev,
        url: dataUrl,
        title: prev.title || file.name.replace(/\.[^.]+$/, '')
      }));
    };

    reader.readAsDataURL(file);
  };

  const imagesCount = useMemo(() => images.length, [images]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-6">
          <h1 className="text-xl font-semibold">Admin · Gallery</h1>
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Back to gallery</a>
        </div>
      </header>

      <main className="mx-auto grid max-w-4xl gap-12 px-4 py-10 lg:grid-cols-[320px_1fr]">
        <section className="space-y-5">
          <div className="space-y-4 rounded border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-800">Add image</h2>
            <div className="space-y-3">
              <label className="block text-xs text-gray-600">
                Image URL
                <input
                  name="url"
                  value={form.url}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-0"
                />
              </label>
              <label className="block text-xs text-gray-600">
                Upload local file
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => importFromFiles(event.target.files)}
                  className="mt-1 w-full text-sm text-gray-600"
                />
              </label>
              <label className="block text-xs text-gray-600">
                Title
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-0"
                />
              </label>
              <label className="block text-xs text-gray-600">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-0"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-gray-600">
                  Photographer
                  <input
                    name="photographer"
                    value={form.photographer}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-0"
                  />
                </label>
                <label className="block text-xs text-gray-600">
                  Location
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-0"
                  />
                </label>
              </div>
              <label className="block text-xs text-gray-600">
                Tags (comma separated)
                <input
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="nature, mountain"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-0"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-gray-600">
                  Width (px)
                  <input
                    name="width"
                    value={form.width}
                    onChange={handleChange}
                    inputMode="numeric"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-0"
                  />
                </label>
                <label className="block text-xs text-gray-600">
                  Height (px)
                  <input
                    name="height"
                    value={form.height}
                    onChange={handleChange}
                    inputMode="numeric"
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-0"
                  />
                </label>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="button"
              onClick={handleAdd}
              disabled={submitting}
              className="w-full rounded border border-gray-900 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white disabled:border-gray-300 disabled:text-gray-400"
            >
              {submitting ? 'Saving...' : 'Save image'}
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Uploaded images</h2>
            <span className="text-xs text-gray-500">{imagesCount} items</span>
          </div>

          {loading ? (
            <div className="rounded border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : images.length === 0 ? (
            <div className="rounded border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              No custom images yet.
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {images.map(image => (
                <li key={image.id} className="overflow-hidden rounded border border-gray-200 bg-white">
                  <div className="aspect-video bg-gray-100">
                    <img src={image.url} alt={image.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-2 px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{image.title}</div>
                    {image.description && (
                      <p className="text-xs text-gray-500">{image.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{image.tags?.length ? `#${image.tags.join(' #')}` : 'No tags'}</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(image.id)}
                        disabled={deletingId === image.id}
                        className="text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline disabled:text-gray-300"
                      >
                        {deletingId === image.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-gray-500">
            Items are stored on the local API server and are shared across browsers.
          </p>
        </section>
      </main>
    </div>
  );
};

export default AdminPage;
