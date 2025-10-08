import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TradeEntryForm from '../components/TradeEntryForm';
import SeedOverviewChart from '../components/SeedOverviewChart';
import TradeEntriesList from '../components/TradeEntriesList';
import HeaderNavigation from '../components/HeaderNavigation';
import ChatAssistantPanel from '../components/ChatAssistantPanel';
import ThemeToggleButton from '../components/ThemeToggleButton';
import GoalProgressCard from '../components/GoalProgressCard';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';

const DASHBOARD_TITLE = '일일 자본 트래커';
const DASHBOARD_SUBTITLE = '각 거래가 전체 자본에 미치는 영향을 기록하고, 결정의 근거를 남겨 다음 전략에 반영하세요.';
const ERROR_CLOSE_LABEL = '닫기';
const LOADING_MESSAGE = '데이터를 불러오는 중입니다...';

const PortfolioDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const loadRequestedRef = useRef(false);
  const promoTimeoutRef = useRef<number | null>(null);
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
  const { user } = useAuthStore();
  const isAdFreeUser = useMemo(() => user?.role === 'ADMIN' || user?.subscriptionTier === 'PRO', [user]);
  const [tradeSavedPromoVisible, setTradeSavedPromoVisible] = useState(false);

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

  useEffect(() => {
    return () => {
      if (promoTimeoutRef.current) {
        window.clearTimeout(promoTimeoutRef.current);
      }
    };
  }, []);

  const showTradePromo = () => {
    if (isAdFreeUser) {
      return;
    }

    setTradeSavedPromoVisible(true);
    if (promoTimeoutRef.current) {
      window.clearTimeout(promoTimeoutRef.current);
    }
    promoTimeoutRef.current = window.setTimeout(() => {
      setTradeSavedPromoVisible(false);
      promoTimeoutRef.current = null;
    }, 8000);
  };

  const handleAddTrade = async (payload: Parameters<typeof addTrade>[0]) => {
    try {
      await addTrade(payload);
      showTradePromo();
    } catch {
      // state already updated with error
    }
  };

  const showPlaceholder = !hasLoaded || initialSeed === null;

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <HeaderNavigation />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold">{DASHBOARD_TITLE}</h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-300">{DASHBOARD_SUBTITLE}</p>
        </header>

        {error && (
          <div className="mt-8 flex items-start justify-between rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-300">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="text-xs underline">{ERROR_CLOSE_LABEL}</button>
          </div>
        )}

        {showPlaceholder ? (
          <div className="mt-16 text-sm text-slate-500 dark:text-slate-300">{LOADING_MESSAGE}</div>
        ) : (
          <main className="mt-10 grid gap-10 lg:grid-cols-[320px_1fr]">
            <TradeEntryForm onSubmit={handleAddTrade} loading={loading} />
            <div className="space-y-8">
              {tradeSavedPromoVisible && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-900 shadow-sm dark:border-amber-400/50 dark:bg-amber-500/10 dark:text-amber-200">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-semibold text-amber-900 dark:text-amber-200">Trade saved successfully!</div>
                    <span className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Sponsored</span>
                  </div>
                  <p className="mt-3 leading-6 text-amber-800 dark:text-amber-200/90">
                    Start a free preview of the Trakko macro insights pack and prepare your next move with daily briefings.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-500 dark:bg-amber-300 dark:text-amber-900 dark:hover:bg-amber-200"
                  >
                    Start 7-day trial
                  </button>
                </section>
              )}
              {performanceGoal && (
                <GoalProgressCard summary={performanceGoal} loading={goalLoading} />
              )}
              <SeedOverviewChart initialSeed={initialSeed} trades={trades} />
              {!isAdFreeUser && (
                <section className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Trakko recommended resources</h2>
                    <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Sponsored</span>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <article className="flex flex-col gap-2 rounded-lg border border-slate-200 px-4 py-3 transition hover:border-slate-300 dark:border-slate-700 dark:hover-border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">AI briefings</p>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Real-time news digest alerts</h3>
                      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Get market headlines every five minutes with concise takeaways tailored to active traders.
                      </p>
                      <button
                        type="button"
                        className="mt-2 inline-flex w-max items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        View details
                      </button>
                    </article>
                    <article className="flex flex-col gap-2 rounded-lg border border-slate-200 px-4 py-3 transition hover:border-slate-300 dark:border-slate-700 dark:hover-border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Premium course</p>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Portfolio risk masterclass</h3>
                      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Learn step-by-step risk control frameworks used by professionals and apply them with ready templates.
                      </p>
                      <button
                        type="button"
                        className="mt-2 inline-flex w-max items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover-border-slate-500 dark:hover:text-slate-100"
                      >
                        Enrol now
                      </button>
                    </article>
                  </div>
                </section>
              )}
              <TradeEntriesList initialSeed={initialSeed} trades={trades} />
            </div>
          </main>
        )}
      </div>
      <ThemeToggleButton />
      <button
        type="button"
        disabled={showPlaceholder}
        onClick={() => setAssistantOpen(true)}
        className={`fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus:ring-slate-600 ${assistantOpen ? 'hidden' : ''}`}
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
