import React, { useEffect, useState } from 'react';

interface AdminGuardProps {
  children: React.ReactNode;
}

const SESSION_KEY = 'admin_authed_v1';

const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const expected = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) || 'admin1234';

  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === 'true';
    setIsAuthed(ok);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === expected) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAuthed(true);
      setError('');
    } else {
      setError('비밀번호가 올바르지 않습니다.');
    }
  };

  if (isAuthed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border rounded-2xl shadow-sm p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-1">관리자 로그인</h1>
        <p className="text-sm text-gray-500 mb-6">비밀번호를 입력해 주세요.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="••••••••"
              aria-label="관리자 비밀번호"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
          <button type="submit" className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700">로그인</button>
        </form>
        <p className="mt-4 text-xs text-gray-400">기본 비밀번호는 admin1234 입니다. 빌드 시 <code>VITE_ADMIN_PASSWORD</code>로 변경하세요.</p>
        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-emerald-700 hover:underline">홈으로 돌아가기</a>
        </div>
      </div>
    </div>
  );
};

export default AdminGuard;


