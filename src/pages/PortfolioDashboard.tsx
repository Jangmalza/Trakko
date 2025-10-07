import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TradeEntryForm from '../components/TradeEntryForm';
import SeedOverviewChart from '../components/SeedOverviewChart';
import TradeEntriesList from '../components/TradeEntriesList';
import HeaderNavigation from '../components/HeaderNavigation';
import ChatAssistantPanel from '../components/ChatAssistantPanel';
import GoalProgressCard from '../components/GoalProgressCard';
import { usePortfolioStore } from '../store/portfolioStore';
import { useShallow } from 'zustand/react/shallow';

const DASHBOARD_TITLE = '일일 자본 트래커';
const DASHBOARD_SUBTITLE = '각 거래가 전체 자본에 미치는 영향을 기록하고, 결정의 근거를 남겨 다음 전략에 반영하세요.';
const ERROR_CLOSE_LABEL = '닫기';
const LOADING_MESSAGE = '데이터를 불러오는 중입니다...';

const PortfolioDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const loadRequestedRef = useRef(false);
  const {
    initialSeed,
    trades,
    loading,
    loadPortfolio,
    addTrade,
    error,
    clearError,
    hasLoaded,
    performanceGoal,
    goalLoading
  } = usePortfolioStore(useShallow((state) => ({
    initialSeed: state.initialSeed,
    trades: state.trades,
    loading: state.loading,
    loadPortfolio: state.loadPortfolio,
    addTrade: state.addTrade,
    error: state.error,
    clearError: state.clearError,
    hasLoaded: state.hasLoaded,
    performanceGoal: state.performanceGoal,
    goalLoading: state.goalLoading
  })));

  useEffect(() => {
    if (loadRequestedRef.current) return;
    loadRequestedRef.current = true;
    void loadPortfolio();
  }, [loadPortfolio]);

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
              {performanceGoal && (
                <GoalProgressCard summary={performanceGoal} loading={goalLoading} />
              )}
              <SeedOverviewChart initialSeed={initialSeed} trades={trades} />
              <TradeEntriesList initialSeed={initialSeed} trades={trades} />
            </div>
          </main>
        )}
      </div>
      <button
        type="button"
        disabled={showPlaceholder}
        onClick={() => setAssistantOpen(true)}
        className={`fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-300 ${assistantOpen ? 'hidden' : ''}`}
      >
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
        AI 어시스턴트
      </button>

      {assistantOpen && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 backdrop-blur-sm"
          onClick={() => setAssistantOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-sm flex-col p-4 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <ChatAssistantPanel
              trades={trades}
              initialSeed={initialSeed}
              onClose={() => setAssistantOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioDashboard;
