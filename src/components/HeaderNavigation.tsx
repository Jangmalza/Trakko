import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import MiniMarketTicker from './MiniMarketTicker';

const HeaderNavigation: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, getLoginUrl } = useAuthStore();
  const isProUser = user?.subscriptionTier === 'PRO' || user?.role === 'ADMIN';

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-col">
      <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100"
        >
          <span className="text-xl font-black tracking-[0.3em]">TRAKKO</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/dashboard" className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
            대시보드
          </Link>
          <Link to="/trades" className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
            거래 기록
          </Link>
          <Link to="/announcements" className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
            공지사항
          </Link>
          <Link to="/community" className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
            커뮤니티
          </Link>
          <Link to="/subscription" className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
            구독
          </Link>
          <Link to="/settings" className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
            설정
          </Link>
          {user ? (
            <>
              <span className="hidden items-center gap-2 text-slate-500 dark:text-slate-300 sm:inline sm:flex">
                {user.displayName || user.email}
                {isProUser && (
                  <span className="inline-flex items-center rounded-full border border-emerald-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500 dark:border-emerald-300 dark:text-emerald-200">
                    Pro
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded border border-slate-300 px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                로그아웃
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className="rounded bg-slate-900 px-3 py-1.5 text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Google 로그인
            </button>
          )}
        </div>
      </nav>
      <MiniMarketTicker />
    </div>
  );
};

export default HeaderNavigation;
