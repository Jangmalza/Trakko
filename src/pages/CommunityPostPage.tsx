import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import HeaderNavigation from '../components/HeaderNavigation';
import ThemeToggleButton from '../components/ThemeToggleButton';
import {
  deleteCommunityPost,
  fetchCommunityPost,
  resolveCommunityImageUrl
} from '../api/communityApi';
import { createComment, fetchComments, type CommunityComment } from '../api/communityCommentsApi';
import type { CommunityPost } from '../api/communityApi';
import { useAuthStore } from '../store/authStore';

const COMMENT_LIMIT = 2000;

const CommunityPostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, getLoginUrl } = useAuthStore();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const postImageUrl = useMemo(() => resolveCommunityImageUrl(post?.imageUrl ?? null), [post?.imageUrl]);
  const showUpdatedBanner = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('updated') === '1';
  }, [location.search]);
  const canManagePost = Boolean(
    user && post && (post.author?.id ? post.author.id === user.id || user.role === 'ADMIN' : user.role === 'ADMIN')
  );

  useEffect(() => {
    if (!postId) {
      navigate('/community', { replace: true });
      return;
    }

    const loadPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetched = await fetchCommunityPost(postId);
        setPost(fetched);
      } catch (fetchError) {
        console.error('Failed to load community post', fetchError);
        const message =
          fetchError instanceof Error ? fetchError.message : '게시글을 불러오지 못했습니다.';
        setError(message);
        setPost(null);
        if (message.includes('찾을 수 없습니다')) {
          navigate('/community', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    const loadComments = async () => {
      setCommentLoading(true);
      try {
        const list = await fetchComments(postId);
        setComments(list);
      } catch (fetchError) {
        console.error(fetchError);
        setCommentError(fetchError instanceof Error ? fetchError.message : '댓글을 불러오지 못했습니다.');
      } finally {
        setCommentLoading(false);
      }
    };

    void loadPost();
    void loadComments();
  }, [postId, navigate]);

  const trimmedComment = commentContent.trim();
  const canComment = Boolean(user);
  const formValid = trimmedComment.length > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!postId || !canComment || !formValid || submitting) return;

    setSubmitting(true);
    try {
      const created = await createComment(postId, trimmedComment);
      setComments((current) => [...current, created]);
      setCommentContent('');
    } catch (createError) {
      console.error(createError);
      setCommentError(createError instanceof Error ? createError.message : '댓글을 등록하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const commentEmptyMessage = useMemo(() => {
    if (commentLoading) return '댓글을 불러오는 중입니다...';
    if (comments.length === 0) return '첫 댓글을 남겨보세요!';
    return null;
  }, [commentLoading, comments]);

  const handleDelete = async () => {
    if (!postId || !canManagePost || deleting) return;
    const confirmed = window.confirm('게시글을 삭제하시겠어요? 삭제 후에는 복구할 수 없습니다.');
    if (!confirmed) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCommunityPost(postId);
      navigate('/community?deleted=1', { replace: true });
    } catch (deleteErr) {
      console.error('Failed to delete community post', deleteErr);
      setDeleteError(deleteErr instanceof Error ? deleteErr.message : '게시글을 삭제하지 못했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <HeaderNavigation />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/community"
          className="text-xs text-slate-500 underline underline-offset-4 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ← 목록으로 돌아가기
        </Link>

        {error && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}
        {showUpdatedBanner && !error && (
          <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200">
            게시글이 성공적으로 수정되었습니다.
          </div>
        )}
        {deleteError && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200">
            {deleteError}
          </div>
        )}

        {loading ? (
          <div className="mt-10 rounded border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
            게시글을 불러오는 중입니다...
          </div>
        ) : post ? (
          <>
            <article className="mt-6 rounded-xl border border-slate-200 bg-white px-6 py-6 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Community Post</p>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{post.title}</h1>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                  {post.author?.subscriptionTier === 'PRO' && (
                    <span className="inline-flex items-center rounded-full border border-emerald-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500 dark:border-emerald-300 dark:text-emerald-200">
                      Pro
                    </span>
                  )}
                </div>
              </header>
              {postImageUrl && (
                <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                  <img
                    src={postImageUrl}
                    alt={`${post.title} 첨부 이미지`}
                    className="w-full object-contain"
                  />
                </div>
              )}
              <div className="mt-4 whitespace-pre-line text-base leading-7 text-slate-800 dark:text-slate-100">
                {post.content}
              </div>
              <footer className="mt-6 flex flex-col gap-3 text-[11px] text-slate-400 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {post.author
                    ? `${post.author.displayName ?? post.author.email ?? '회원'} · ${
                        post.author.subscriptionTier === 'PRO' ? 'Pro' : 'Free'
                      }`
                    : '탈퇴한 사용자'}
                </span>
                {canManagePost && (
                  <div className="flex items-center gap-2 text-xs">
                    <Link
                      to={`/community/${post.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
                    >
                      게시글 수정
                    </Link>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1 font-semibold text-red-600 transition hover:border-red-400 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/60 dark:text-red-300 dark:hover:border-red-400/80 dark:hover:text-red-200"
                    >
                      {deleting ? '삭제 중...' : '게시글 삭제'}
                    </button>
                  </div>
                )}
              </footer>
            </article>

            <section className="mt-10 space-y-4 rounded-xl border border-slate-200 bg-white px-6 py-6 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <header>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">댓글</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  질문이나 피드백을 남겨주세요. 서로 예의를 지켜주세요.
                </p>
              </header>

              {commentEmptyMessage ? (
                <div className="rounded border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  {commentEmptyMessage}
                </div>
              ) : (
                <ul className="space-y-3">
                  {comments.map((comment) => (
                    <li
                      key={comment.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                        <span>
                          {comment.author
                            ? `${comment.author.displayName ?? comment.author.email ?? '회원'} · ${
                                comment.author.subscriptionTier === 'PRO' ? 'Pro' : 'Free'
                              }`
                            : '탈퇴한 사용자'}
                        </span>
                        <span>{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-200">
                        {comment.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {!canComment ? (
                <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  댓글을 작성하려면 먼저 로그인하세요.
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = getLoginUrl();
                    }}
                    className="ml-2 text-blue-500 underline underline-offset-4 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    로그인하기
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-2">
                  <textarea
                    value={commentContent}
                    onChange={(event) => setCommentContent(event.target.value.slice(0, COMMENT_LIMIT))}
                    rows={4}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="댓글을 입력해주세요."
                    disabled={submitting}
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                    <span>{commentContent.length}/{COMMENT_LIMIT}</span>
                    <button
                      type="submit"
                      disabled={!formValid || submitting}
                      className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      {submitting ? '작성 중...' : '댓글 등록'}
                    </button>
                  </div>
                  {commentError && <p className="text-xs text-red-500">{commentError}</p>}
                </form>
              )}
            </section>
          </>
        ) : (
          <div className="mt-10 rounded border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
            게시글을 찾을 수 없습니다.
          </div>
        )}
      </div>
      <ThemeToggleButton />
    </div>
  );
};

export default CommunityPostPage;
