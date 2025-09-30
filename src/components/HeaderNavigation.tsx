import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const HeaderNavigation: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    hasChecked,
    checking,
    bootstrap,
    logout,
    getLoginUrl
  } = useAuthStore();

  useEffect(() => {
    if (!hasChecked && !checking) {
      void bootstrap();
    }
  }, [bootstrap, hasChecked, checking]);

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <Link to="/dashboard" className="text-sm font-semibold text-slate-900">
        Trakko
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/dashboard" className="text-slate-600 hover:text-slate-900">
          대시보드
        </Link>
        <Link to="/settings" className="text-slate-600 hover:text-slate-900">
          설정
        </Link>
        {user ? (
          <>
            <span className="hidden text-slate-500 sm:inline">{user.displayName || user.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded border border-slate-300 px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              로그아웃
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            className="rounded bg-slate-900 px-3 py-1.5 text-white transition hover:bg-slate-800"
          >
            Google 로그인
          </button>
        )}
      </div>
    </nav>
  );
};

export default HeaderNavigation;



