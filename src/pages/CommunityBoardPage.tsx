import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HeaderNavigation from '../components/HeaderNavigation';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { useAuthStore } from '../store/authStore';
import { fetchCommunityPosts, type CommunityPost } from '../api/communityApi';

const ERROR_DEFAULT = '게시글을 불러오는 중 오류가 발생했습니다.';

const CommunityBoardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'pro'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await fetchCommunityPosts();
        setPosts(items);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError instanceof Error ? fetchError.message : ERROR_DEFAULT);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const canCreate = Boolean(user);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredPosts = useMemo(() => {
    let base = posts;
    if (filterMode === 'mine' && user) {
      base = base.filter((post) => post.author?.id === user.id);
    }
    if (filterMode === 'pro') {
      base = base.filter((post) => post.author?.subscriptionTier === 'PRO');
    }
    if (normalizedSearch.length > 0) {
      base = base.filter((post) =>
        post.title.toLowerCase().includes(normalizedSearch) || post.content.toLowerCase().includes(normalizedSearch)
      );
    }
    return base;
  }, [posts, filterMode, normalizedSearch, user]);

  const emptyMessage = useMemo(() => {
    if (loading) return '게시글을 불러오는 중입니다...';
    if (posts.length === 0) {
      return '아직 작성된 게시글이 없습니다. 첫 글을 남겨보세요!';
    }
    if (filteredPosts.length === 0) {
      return '선택한 필터 또는 검색어에 해당하는 게시글이 없습니다.';
    }
    return null;
  }, [loading, posts, filteredPosts]);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <HeaderNavigation />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Community</p>
          <h1 className="text-3xl font-semibold">커뮤니티 게시판</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            최근 거래 인사이트, 전략, 질문을 자유롭게 공유해 보세요.
          </p>
        </header>

        {error && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex-1">
            {canCreate ? '새로운 거래 경험이나 궁금한 점을 공유해 보세요.' : '로그인 후 게시글을 작성할 수 있습니다.'}
          </div>
          <Link
            to={canCreate ? '/community/new' : '/community'}
            className={`inline-flex items-center gap-2 rounded px-4 py-2 font-semibold transition ${
              canCreate
                ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
                : 'cursor-not-allowed border border-slate-300 text-slate-400 dark:border-slate-700 dark:text-slate-500'
            }`}
          >
            새 게시글 작성하기
          </Link>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-6 py-6 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">커뮤니티 이용 가이드</h2>
          <ul className="mt-3 space-y-2 list-disc pl-4">
            <li>최근 거래에서 얻은 인사이트나 전략을 공유해 주세요.</li>
            <li>질문에는 상황과 고민을 자세히 적어 주시면 더 좋은 답변을 얻을 수 있어요.</li>
            <li>Pro 사용자의 글에는 Pro 배지가 표시됩니다.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">최신 게시글</h2>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="제목 또는 내용 검색"
              className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-64"
            />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100'
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('mine')}
              disabled={!user}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                filterMode === 'mine'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100'
              } ${!user ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              내 글만
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('pro')}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                filterMode === 'pro'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100'
              }`}
            >
              Pro 작성글
            </button>
          </div>

          {emptyMessage ? (
            <div className="rounded border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              {emptyMessage}
            </div>
          ) : (
            <ul className="space-y-4">
              {filteredPosts.map((post) => (
                <li key={post.id} className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-700 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{post.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                        <span>{new Date(post.createdAt).toLocaleString()}</span>
                        {post.author?.subscriptionTier === 'PRO' && (
                          <span className="inline-flex items-center rounded-full border border-emerald-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500 dark:border-emerald-300 dark:text-emerald-200">
                            Pro
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-200">{post.content}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                    <span>
                      {post.author
                        ? `${post.author.displayName ?? post.author.email ?? '회원'} · ${post.author.subscriptionTier === 'PRO' ? 'Pro' : 'Free'}`
                        : '탈퇴한 사용자'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <ThemeToggleButton />
    </div>
  );
};

export default CommunityBoardPage;
