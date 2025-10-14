import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import HeaderNavigation from '../components/HeaderNavigation';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { createCommunityPost } from '../api/communityApi';
import { useAuthStore } from '../store/authStore';

const TITLE_LIMIT = 120;
const CONTENT_LIMIT = 5000;

const CommunityComposePage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const formValid = trimmedTitle.length > 0 && trimmedContent.length > 0;
  const canCreate = Boolean(user);

  const statusMessage = useMemo(() => {
    if (!user) {
      return '로그인 후에만 게시글을 작성할 수 있습니다. 상단의 로그인 버튼을 눌러 접속해 주세요.';
    }
    return '최근 거래에서 얻은 인사이트, 질문, 전략을 자유롭게 공유해 주세요.';
  }, [user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate || !formValid || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await createCommunityPost({
        title: trimmedTitle,
        content: trimmedContent
      });
      navigate('/community?submitted=1', { replace: true });
    } catch (submitError) {
      console.error('Failed to create community post', submitError);
      setError(submitError instanceof Error ? submitError.message : '게시글을 등록하지 못했습니다.');
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
          <h1 className="text-3xl font-semibold">게시글 작성</h1>
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
                disabled={!canCreate || submitting}
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
                disabled={!canCreate || submitting}
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">{content.length}/{CONTENT_LIMIT}</span>
            </label>

            <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              <button
                type="submit"
                disabled={!formValid || !canCreate || submitting}
                className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {submitting ? '등록 중...' : '게시글 등록'}
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
        </section>

        <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-6 py-6 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">작성 팁</h2>
          <ul className="mt-3 space-y-2 list-disc pl-4">
            <li>실제 거래 경험과 인사이트를 담으면 다른 사용자에게 더 도움이 됩니다.</li>
            <li>질문에는 가능한 한 상황과 근거를 자세히 적어 주세요.</li>
            <li>Pro 구독자의 게시글에는 Pro 배지가 표시됩니다.</li>
          </ul>
          <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">게시글은 추후 댓글 및 알림 기능과 연동될 예정입니다.</p>
        </section>
      </div>
      <ThemeToggleButton />
    </div>
  );
};

export default CommunityComposePage;
