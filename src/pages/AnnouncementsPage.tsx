import React, { useCallback, useEffect, useMemo, useState } from 'react';
import HeaderNavigation from '../components/HeaderNavigation';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { useAuthStore } from '../store/authStore';
import type { Announcement, AnnouncementInput, AnnouncementStatus } from '../types/announcement';
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement
} from '../api/announcementApi';

const statusLabels: Record<AnnouncementStatus, string> = {
  DRAFT: '임시',
  PUBLISHED: '게시',
  ARCHIVED: '보관'
};

const statusStyles: Record<AnnouncementStatus, string> = {
  DRAFT: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  PUBLISHED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  ARCHIVED: 'bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
};

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

interface AnnouncementFormState {
  title: string;
  content: string;
  status: AnnouncementStatus;
  publishedAt: string;
  expiresAt: string;
}

const emptyForm: AnnouncementFormState = {
  title: '',
  content: '',
  status: 'DRAFT',
  publishedAt: '',
  expiresAt: ''
};

const statusOptions: AnnouncementStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

const initialLoadError = '공지사항을 불러오지 못했습니다.';
const saveErrorMessage = '공지사항 저장에 실패했습니다.';
const deleteErrorMessage = '공지사항 삭제에 실패했습니다.';

function formatDateTime(value: string | null): string {
  if (!value) return '미정';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '미정';
  return dateTimeFormatter.format(date);
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (input: number) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toISOStringOrNull(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isActiveAnnouncement(announcement: Announcement, reference: Date = new Date()): boolean {
  if (announcement.status !== 'PUBLISHED') return false;
  if (announcement.publishedAt) {
    const publishedAt = new Date(announcement.publishedAt);
    if (Number.isNaN(publishedAt.getTime()) || publishedAt > reference) {
      return false;
    }
  }
  if (announcement.expiresAt) {
    const expiresAt = new Date(announcement.expiresAt);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt <= reference) {
      return false;
    }
  }
  return true;
}

const AnnouncementsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [formState, setFormState] = useState<AnnouncementFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchAnnouncements(isAdmin ? 'all' : 'public');
      setAnnouncements(items);
    } catch (loadError) {
      console.error('Failed to load announcements', loadError);
      setError(loadError instanceof Error ? loadError.message : initialLoadError);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  const visibleAnnouncements = useMemo(
    () => announcements.filter((announcement) => isActiveAnnouncement(announcement)),
    [announcements]
  );

  const hiddenAnnouncements = useMemo(
    () => announcements.filter((announcement) => !isActiveAnnouncement(announcement)),
    [announcements]
  );

  const resetForm = useCallback(() => {
    setFormState(emptyForm);
    setEditing(null);
    setEditorOpen(false);
    setSubmitting(false);
    setActionError(null);
  }, []);

  const openCreateForm = () => {
    setFormState(emptyForm);
    setEditing(null);
    setActionError(null);
    setEditorOpen(true);
  };

  const openEditForm = (announcement: Announcement) => {
    setEditing(announcement);
    setFormState({
      title: announcement.title,
      content: announcement.content,
      status: announcement.status,
      publishedAt: toDateTimeLocal(announcement.publishedAt),
      expiresAt: toDateTimeLocal(announcement.expiresAt)
    });
    setActionError(null);
    setEditorOpen(true);
  };

  const handleFormChange = <Key extends keyof AnnouncementFormState>(key: Key, value: AnnouncementFormState[Key]) => {
    setFormState((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;

    const payload: AnnouncementInput = {
      title: formState.title.trim(),
      content: formState.content.trim(),
      status: formState.status,
      publishedAt: toISOStringOrNull(formState.publishedAt),
      expiresAt: toISOStringOrNull(formState.expiresAt)
    };

    if (!payload.title || !payload.content) {
      setActionError('제목과 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    try {
      if (editing) {
        await updateAnnouncement(editing.id, payload);
      } else {
        await createAnnouncement(payload);
      }
      await loadAnnouncements();
      resetForm();
    } catch (submitError) {
      console.error('Failed to save announcement', submitError);
      setActionError(submitError instanceof Error ? submitError.message : saveErrorMessage);
      setSubmitting(false);
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`'${announcement.title}' 공지를 삭제할까요?`);
    if (!confirmed) return;

    setSubmitting(true);
    setActionError(null);

    try {
      await deleteAnnouncement(announcement.id);
      await loadAnnouncements();
      resetForm();
    } catch (deleteError) {
      console.error('Failed to delete announcement', deleteError);
      setActionError(deleteError instanceof Error ? deleteError.message : deleteErrorMessage);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <HeaderNavigation />
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Announcements</p>
          <h1 className="text-3xl font-semibold">공지사항</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            서비스 업데이트, 점검, 새로운 기능 소식을 이곳에서 확인하세요.
          </p>
        </header>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-500 dark:text-slate-300">공지사항을 불러오는 중입니다...</div>
        ) : visibleAnnouncements.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            현재 게시된 공지사항이 없습니다.
          </div>
        ) : (
          <section className="space-y-6">
            {visibleAnnouncements.map((announcement) => (
              <article
                key={announcement.id}
                className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{announcement.title}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    게시일 {formatDateTime(announcement.publishedAt ?? announcement.createdAt)}
                  </p>
                </div>
                <div className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {announcement.content}
                </div>
                {announcement.expiresAt && (
                  <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                    게시 종료 예정일: {formatDateTime(announcement.expiresAt)}
                  </p>
                )}
              </article>
            ))}
          </section>
        )}

        {isAdmin && (
          <section className="space-y-6 rounded-xl border border-slate-200 bg-white px-6 py-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">관리자 도구</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  임시 저장된 공지나 비공개 공지를 포함해 전체 목록을 관리할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center justify-center rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                새 공지 작성
              </button>
            </div>

            {editorOpen && (
              <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 p-5 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {editing ? '공지 수정' : '공지 작성'}
                  </h3>
                  <div className="flex gap-2 text-xs">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 ${statusStyles[formState.status]}`}>
                      {statusLabels[formState.status]}
                    </span>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded border border-slate-200 px-2 py-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
                      disabled={submitting}
                    >
                      닫기
                    </button>
                  </div>
                </div>

                {actionError && (
                  <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-300">
                    {actionError}
                  </p>
                )}

                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  제목
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(event) => handleFormChange('title', event.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-600"
                    placeholder="공지 제목을 입력하세요"
                    required
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  내용
                  <textarea
                    value={formState.content}
                    onChange={(event) => handleFormChange('content', event.target.value)}
                    className="mt-1 h-40 w-full resize-y rounded border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-600"
                    placeholder="공지 내용을 입력하세요 (줄바꿈 가능)"
                    required
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    상태
                    <select
                      value={formState.status}
                      onChange={(event) => handleFormChange('status', event.target.value as AnnouncementStatus)}
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-600"
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {statusLabels[option]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    게시 시작
                    <input
                      type="datetime-local"
                      value={formState.publishedAt}
                      onChange={(event) => handleFormChange('publishedAt', event.target.value)}
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-600"
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    게시 종료
                    <input
                      type="datetime-local"
                      value={formState.expiresAt}
                      onChange={(event) => handleFormChange('expiresAt', event.target.value)}
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-600"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  {editing && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editing)}
                      disabled={submitting}
                      className="rounded border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      삭제
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-progress disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {submitting ? '저장 중...' : editing ? '업데이트' : '등록'}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">전체 공지 목록</h3>
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">등록된 공지가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="flex flex-col gap-3 rounded border border-slate-200 px-4 py-3 text-sm transition hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${statusStyles[announcement.status]}`}>
                            {statusLabels[announcement.status]}
                          </span>
                          <button
                            type="button"
                            onClick={() => openEditForm(announcement)}
                            className="text-left text-sm font-semibold text-slate-900 underline-offset-2 transition hover:underline dark:text-slate-100"
                          >
                            {announcement.title}
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          게시일 {formatDateTime(announcement.publishedAt ?? announcement.createdAt)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {announcement.author && (
                          <span>작성자: {announcement.author.displayName || announcement.author.email || announcement.author.id}</span>
                        )}
                        {announcement.expiresAt && <span>종료 예정: {formatDateTime(announcement.expiresAt)}</span>}
                        {!isActiveAnnouncement(announcement) && <span className="text-amber-600 dark:text-amber-400">현재 비공개</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hiddenAnnouncements.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  비공개 상태 공지 {hiddenAnnouncements.length}개 포함
                </p>
              )}
            </div>
          </section>
        )}
      </div>

      <ThemeToggleButton />
    </div>
  );
};

export default AnnouncementsPage;
