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
import CryptoHighlights from '../components/traderHighlights/CryptoHighlights';
import UsStockHighlights from '../components/traderHighlights/UsStockHighlights';
import KrStockHighlights from '../components/traderHighlights/KrStockHighlights';

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
    goalLoading,
    traderType
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
    goalLoading: state.goalLoading,
    traderType: state.traderType
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

  const renderTraderHighlights = () => {
    switch (traderType) {
      case 'CRYPTO':
        return <CryptoHighlights />;
      case 'US_STOCK':
        return <UsStockHighlights />;
      case 'KR_STOCK':
      default:
        return <KrStockHighlights />;
    }
  };

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
                <section className="rounded-xl border border-amber-200 bg-amber-100 px-6 py-5 text-sm text-amber-900 shadow-sm dark:border-amber-400/50 dark:bg-amber-500/20 dark:text-amber-200">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-semibold text-amber-900 dark:text-amber-200">거래가 성공적으로 저장되었습니다!</div>
                    <span className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">스폰서</span>
                  </div>
                  <p className="mt-3 leading-6 text-amber-800 dark:text-amber-200/90">
                    Trakko 매크로 인사이트 팩을 무료로 체험하고 일간 브리핑으로 다음 전략을 준비하세요.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-500 dark:bg-amber-300 dark:text-amber-900 dark:hover:bg-amber-200"
                  >
                    7일 체험 시작하기
                  </button>
                </section>
              )}
              {performanceGoal && (
                <GoalProgressCard summary={performanceGoal} loading={goalLoading} />
              )}
              <SeedOverviewChart initialSeed={initialSeed} trades={trades} />
              {renderTraderHighlights()}
              {!isAdFreeUser && (
                <section className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Trakko 추천 리소스</h2>
                    <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">스폰서</span>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <article className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-100/80 px-4 py-3 transition hover:border-amber-300 dark:border-amber-400/50 dark:bg-amber-500/20">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-200">AI 브리핑</p>
                      <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">실시간 뉴스 다이제스트 알림</h3>
                      <p className="text-xs leading-5 text-amber-700/90 dark:text-amber-200/80">
                        5분마다 핵심 시장 헤드라인을 받아보고 활동적인 트레이더를 위한 요약을 확인하세요.
                      </p>
                      <button
                        type="button"
                        className="mt-2 inline-flex w-max items-center gap-2 rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-500 dark:bg-amber-300 dark:text-amber-900 dark:hover:bg-amber-200"
                      >
                        자세히 보기
                      </button>
                    </article>
                    <article className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-100/80 px-4 py-3 transition hover:border-amber-300 dark:border-amber-400/50 dark:bg-amber-500/20">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-200">프리미엄 강의</p>
                      <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">포트폴리오 리스크 마스터클래스</h3>
                      <p className="text-xs leading-5 text-amber-700/90 dark:text-amber-200/80">
                        전문가가 사용하는 단계별 리스크 관리 프레임워크를 템플릿과 함께 익혀 실전에 적용하세요.
                      </p>
                      <button
                        type="button"
                        className="mt-2 inline-flex w-max items-center gap-2 rounded-full border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-800 transition hover:border-amber-500 hover:text-amber-900 dark:border-amber-300 dark:text-amber-200 dark:hover:border-amber-200 dark:hover:text-amber-100"
                      >
                        지금 등록하기
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
