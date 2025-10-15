import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import HeaderNavigation from '../components/HeaderNavigation';
import {
  createCommunityPost,
  fetchCommunityPost,
  resolveCommunityImageUrl,
  updateCommunityPost
} from '../api/communityApi';
import { useAuthStore } from '../store/authStore';

const TITLE_LIMIT = 120;
const CONTENT_LIMIT = 5000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const CommunityComposePage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { postId } = useParams<{ postId?: string }>();
  const isEditing = Boolean(postId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [initialImageUrl, setInitialImageUrl] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<'existing' | 'new' | 'none'>(isEditing ? 'none' : 'none');
  const [postAuthorId, setPostAuthorId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const formValid = trimmedTitle.length > 0 && trimmedContent.length > 0;
  const isAuthorizedForEdit =
    !isEditing ||
    (user
      ? postAuthorId
        ? user.id === postAuthorId || user.role === 'ADMIN'
        : user.role === 'ADMIN'
      : false);
  const canSubmit = Boolean(user) && !loading && isAuthorizedForEdit;
  const shouldRemoveExistingImage = isEditing && imageMode === 'none' && Boolean(initialImageUrl);

  const statusMessage = useMemo(() => {
    if (!user) {
      return '로그인 후에만 게시글을 작성할 수 있습니다. 상단의 로그인 버튼을 눌러 접속해 주세요.';
    }
    if (isEditing) {
      return loading ? '게시글 정보를 불러오는 중입니다...' : '게시글 내용을 수정하고 다시 공유해 주세요.';
    }
    return '최근 거래에서 얻은 인사이트, 질문, 전략을 자유롭게 공유해 주세요.';
  }, [user, isEditing, loading]);

  const revokeCurrentObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeCurrentObjectUrl();
    };
  }, [revokeCurrentObjectUrl]);

  useEffect(() => {
    if (!isEditing || !postId) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const post = await fetchCommunityPost(postId);
        setTitle(post.title);
        setContent(post.content);
        setInitialImageUrl(post.imageUrl ?? null);
        setPostAuthorId(post.author?.id ?? null);
        setImageFile(null);
        setImageError(null);
        revokeCurrentObjectUrl();

        if (post.imageUrl) {
          setImagePreview(resolveCommunityImageUrl(post.imageUrl));
          setImageMode('existing');
        } else {
          setImagePreview(null);
          setImageMode('none');
        }
      } catch (fetchError) {
        console.error('Failed to load community post', fetchError);
        setError(fetchError instanceof Error ? fetchError.message : '게시글을 불러오지 못했습니다.');
        setImagePreview(null);
        setImageMode('none');
        setPostAuthorId(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isEditing, postId, revokeCurrentObjectUrl]);

  useEffect(() => {
    if (!isEditing || !postAuthorId || !user) return;
    if (user.id !== postAuthorId && user.role !== 'ADMIN') {
      setError('게시글을 수정할 수 있는 권한이 없습니다.');
    }
  }, [isEditing, postAuthorId, user]);

  const handleRemoveImage = () => {
    revokeCurrentObjectUrl();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setImageFile(null);
    setImageError(null);

    if (isEditing && imageMode === 'new' && initialImageUrl) {
      setImagePreview(resolveCommunityImageUrl(initialImageUrl));
      setImageMode('existing');
    } else {
      setImagePreview(null);
      setImageMode('none');
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canSubmit || submitting) return;

    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      handleRemoveImage();
      return;
    }

    if (!nextFile.type.startsWith('image/')) {
      setImageError('이미지 파일만 업로드할 수 있습니다.');
      event.target.value = '';
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    if (nextFile.size > MAX_IMAGE_SIZE) {
      setImageError('이미지는 최대 5MB까지 업로드할 수 있습니다.');
      handleRemoveImage();
      return;
    }

    revokeCurrentObjectUrl();
    setImageError(null);
    setImageFile(nextFile);
    const objectUrl = URL.createObjectURL(nextFile);
    objectUrlRef.current = objectUrl;
    setImagePreview(objectUrl);
    setImageMode('new');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !formValid || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && postId) {
        await updateCommunityPost(postId, {
          title: trimmedTitle,
          content: trimmedContent,
          image: imageMode === 'new' ? imageFile ?? undefined : undefined,
          removeImage: shouldRemoveExistingImage
        });
        navigate(`/community/${postId}?updated=1`, { replace: true });
      } else {
        await createCommunityPost({
          title: trimmedTitle,
          content: trimmedContent,
          image: imageFile
        });
        navigate('/community?submitted=1', { replace: true });
      }
    } catch (submitError) {
      console.error(isEditing ? 'Failed to update community post' : 'Failed to create community post', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEditing
            ? '게시글을 수정하지 못했습니다.'
            : '게시글을 등록하지 못했습니다.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <HeaderNavigation />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Community</p>
          <h1 className="text-3xl font-semibold">{isEditing ? '게시글 수정' : '게시글 작성'}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{statusMessage}</p>
        </header>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link
            to="/community"
            className="rounded-full border border-slate-300 px-3 py-1 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:text-slate-100"
          >
            ← 목록으로 돌아가기
          </Link>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white px-6 py-6 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">제목</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value.slice(0, TITLE_LIMIT))}
                maxLength={TITLE_LIMIT}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="글 제목을 입력하세요."
                disabled={!canSubmit || submitting}
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">{title.length}/{TITLE_LIMIT}</span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">내용</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value.slice(0, CONTENT_LIMIT))}
                rows={12}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="공유하고 싶은 내용을 자유롭게 적어주세요."
                disabled={!canSubmit || submitting}
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">{content.length}/{CONTENT_LIMIT}</span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">이미지 (선택)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageChange}
                disabled={!canSubmit || submitting}
                className="text-xs text-slate-500 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 dark:text-slate-400 dark:file:bg-slate-700 dark:file:text-slate-200 dark:hover:file:bg-slate-600"
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">PNG, JPG, WEBP, GIF 형식, 최대 5MB</span>
              {imagePreview && (
                <div className="relative mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                  <img src={imagePreview} alt="선택한 이미지 미리보기" className="h-48 w-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-900 dark:bg-slate-100/80 dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    {isEditing && imageMode === 'existing' ? '이미지 삭제' : '이미지 제거'}
                  </button>
                </div>
              )}
              {imageError && <p className="text-xs text-red-500">{imageError}</p>}
            </label>

            <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              <button
                type="submit"
                disabled={!formValid || !canSubmit || submitting}
                className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {submitting ? (isEditing ? '수정 중...' : '등록 중...') : isEditing ? '게시글 수정' : '게시글 등록'}
              </button>
              <Link
                to="/community"
                className="inline-flex items-center gap-2 rounded border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
              >
                취소
              </Link>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </form>
          {isEditing && loading && (
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              게시글 정보를 불러오는 중입니다. 잠시만 기다려 주세요.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CommunityComposePage;
