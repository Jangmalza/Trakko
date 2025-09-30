import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_CURRENCY } from '../config/appConfig';
import { formatCurrency } from '../utils/formatCurrency';
import { usePortfolioStore } from '../store/portfolioStore';

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
  const [seedInput, setSeedInput] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      void loadPortfolio();
    }
  }, [hasLoaded, loadPortfolio]);

  useEffect(() => {
    if (hasLoaded && initialSeed !== null) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasLoaded, initialSeed, navigate]);

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

  const handleReset = () => {
    setSeedInput('');
    setTouched(false);
    clearError();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Welcome</p>
          <h1 className="text-2xl font-semibold">시작 자본을 입력하세요</h1>
          <p className="text-sm text-slate-500">투자 일지를 기록하기 전에 초기 시드를 입력합니다. 이후에도 설정 화면에서 변경할 수 있습니다.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            초기 시드 ({APP_CURRENCY})
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

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              초기화
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:bg-slate-300"
            >
              {loading ? '저장 중...' : '일지로 이동'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingSeed;
