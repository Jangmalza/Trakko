import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatCurrency';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import TrakkoAuthHero from '../components/TrakkoAuthHero';
import { usePreferencesStore } from '../store/preferencesStore';

const OnboardingSeed: React.FC = () => {
  const navigate = useNavigate();
  const {
    initialSeed,
    loadPortfolio,
    setInitialSeed,
    loading,
    error,
    hasLoaded,
    clearError
  } = usePortfolioStore();
  const {
    user,
    checking,
    hasChecked,
    bootstrap,
    getLoginUrl
  } = useAuthStore();
  const currency = usePreferencesStore((state) => state.currency);
  const [seedInput, setSeedInput] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!hasChecked && !checking) {
      void bootstrap();
    }
  }, [bootstrap, hasChecked, checking]);

  useEffect(() => {
    if (!user || !hasChecked) return;
    if (!hasLoaded) {
      void loadPortfolio();
    }
  }, [user, hasChecked, hasLoaded, loadPortfolio]);

  useEffect(() => {
    if (!user || !hasChecked) return;
    if (hasLoaded && initialSeed !== null) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, hasChecked, hasLoaded, initialSeed, navigate]);

  useEffect(() => {
    if (initialSeed !== null) {
      setSeedInput(String(initialSeed));
    }
  }, [initialSeed]);

  const parsedSeed = Number(seedInput.replace(/,/g, ''));
  const isValid = !Number.isNaN(parsedSeed) && parsedSeed > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;

    try {
      await setInitialSeed(parsedSeed);
      navigate('/dashboard', { replace: true });
    } catch {
      // already handled by store
    }
  };

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  if (!hasChecked || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        로그인 상태를 확인하는 중입니다...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
        <div className="w-full max-w-sm space-y-8 rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl">
          <TrakkoAuthHero />
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleLogin}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <span className="text-base">Google 로그인</span>
            </button>
            <p className="text-xs text-slate-400">
              Google 계정 인증만 사용하며, 이메일 외의 개인정보는 저장하지 않습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-10 px-6 py-12">
        <TrakkoAuthHero />
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">Welcome</p>
          <h1 className="text-2xl font-semibold">시작 자본을 입력하세요</h1>
          <p className="text-sm text-slate-500">
            투자 일지를 기록하기 전에 초기 시드를 입력합니다. 이후에도 설정 화면에서 변경할 수 있습니다.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            초기 시드 ({currency})
            <input
              type="text"
              inputMode="decimal"
              value={seedInput}
              onChange={(event) => {
                const value = event.target.value.replace(/[^0-9.,]/g, '');
                setSeedInput(value);
                if (error) clearError();
              }}
              onBlur={() => setTouched(true)}
              placeholder="예: 5000000"
              className="w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0"
            />
          </label>

          {isValid && (
            <p className="text-xs text-slate-500">표시 미리보기: {formatCurrency(parsedSeed)}</p>
          )}
          {touched && !isValid && (
            <p className="text-xs text-red-500">양의 숫자를 입력해주세요.</p>
          )}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:bg-slate-300"
          >
            {loading ? '저장 중...' : '일지로 이동'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingSeed;
