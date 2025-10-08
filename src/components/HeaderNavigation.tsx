import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import MiniMarketTicker from './MiniMarketTicker';

const HeaderNavigation: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, getLoginUrl } = useAuthStore();

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
        <Link to="/dashboard" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          TRAKKO
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/dashboard" className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
            대시보드
          </Link>
          <Link to="/announcements" className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
            공지사항
          </Link>
          <Link to="/settings" className="text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
            설정
          </Link>
          {user ? (
            <>
              <span className="hidden text-slate-500 dark:text-slate-300 sm:inline">{user.displayName || user.email}</span>
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
