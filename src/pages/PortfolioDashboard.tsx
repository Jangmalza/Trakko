import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TradeEntryForm from '../components/TradeEntryForm';
import SeedOverviewChart from '../components/SeedOverviewChart';
import TradeEntriesList from '../components/TradeEntriesList';
import HeaderNavigation from '../components/HeaderNavigation';
import { usePortfolioStore } from '../store/portfolioStore';

const DASHBOARD_TITLE = '일일 자본 트래커';
const DASHBOARD_SUBTITLE = '각 거래가 전체 자본에 미치는 영향을 기록하고, 결정의 근거를 남겨 다음 전략에 반영하세요.';
const ERROR_CLOSE_LABEL = '닫기';
const LOADING_MESSAGE = '데이터를 불러오는 중입니다...';

const PortfolioDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    initialSeed,
    trades,
    loading,
    loadPortfolio,
    addTrade,
    error,
    clearError,
    hasLoaded
  } = usePortfolioStore();

  useEffect(() => {
    if (!hasLoaded) {
      void loadPortfolio();
    }
  }, [hasLoaded, loadPortfolio]);

  useEffect(() => {
    if (hasLoaded && initialSeed === null) {
      navigate('/', { replace: true });
    }
  }, [hasLoaded, initialSeed, navigate]);

  const handleAddTrade = async (payload: Parameters<typeof addTrade>[0]) => {
    try {
      await addTrade(payload);
    } catch {
      // state already updated with error
    }
  };

  const showPlaceholder = !hasLoaded || initialSeed === null;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <HeaderNavigation />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Investment journal</p>
          <h1 className="text-3xl font-semibold">{DASHBOARD_TITLE}</h1>
          <p className="max-w-2xl text-sm text-slate-500">{DASHBOARD_SUBTITLE}</p>
        </header>

        {error && (
          <div className="mt-8 flex items-start justify-between rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="text-xs underline">{ERROR_CLOSE_LABEL}</button>
          </div>
        )}

        {showPlaceholder ? (
          <div className="mt-16 text-sm text-slate-500">{LOADING_MESSAGE}</div>
        ) : (
          <main className="mt-10 grid gap-10 lg:grid-cols-[320px_1fr]">
            <TradeEntryForm onSubmit={handleAddTrade} loading={loading} />
            <div className="space-y-8">
              <SeedOverviewChart initialSeed={initialSeed} trades={trades} />
              <TradeEntriesList initialSeed={initialSeed} trades={trades} />
            </div>
          </main>
        )}
      </div>
    </div>
  );
};

export default PortfolioDashboard;
