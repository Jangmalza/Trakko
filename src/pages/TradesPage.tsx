import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import HeaderNavigation from '../components/HeaderNavigation';
import ThemeToggleButton from '../components/ThemeToggleButton';
import TradeEntriesList from '../components/TradeEntriesList';
import InlineDatePicker from '../components/InlineDatePicker';
import { usePortfolioStore } from '../store/portfolioStore';

const PAGE_TITLE = '거래 기록';
const PAGE_SUBTITLE = '모든 거래 내역을 한 곳에서 확인하고 수정하거나 삭제할 수 있습니다.';
const LOADING_MESSAGE = '거래 데이터를 불러오는 중입니다...';
const EMPTY_SEED_MESSAGE = '거래 기록을 보려면 먼저 초기 자본을 설정하세요.';
const ONBOARDING_BUTTON = '초기 자본 설정하기';
const DISMISS_ERROR = '알림 닫기';
const SELECTED_DATE_LABEL = '선택한 날짜';
const CLEAR_SELECTION_LABEL = '전체 보기';
const NO_TRADES_FOR_DATE = '선택한 날짜에 기록된 거래가 없습니다.';

const TradesPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const {
    initialSeed,
    trades,
    loading,
    loadPortfolio,
    hasLoaded,
    error,
    clearError
  } = usePortfolioStore(useShallow((state) => ({
    initialSeed: state.initialSeed,
    trades: state.trades,
    loading: state.loading,
    loadPortfolio: state.loadPortfolio,
    hasLoaded: state.hasLoaded,
    error: state.error,
    clearError: state.clearError
  })));

  useEffect(() => {
    if (!hasLoaded && !loading) {
      void loadPortfolio();
    }
  }, [hasLoaded, loading, loadPortfolio]);

  const filteredTrades = useMemo(
    () => (selectedDate ? trades.filter((trade) => trade.tradeDate === selectedDate) : trades),
    [selectedDate, trades]
  );

  const handleCalendarChange = (nextDate: string) => {
    setSelectedDate((current) => (current === nextDate ? '' : nextDate));
  };

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    try {
      const date = new Date(`${selectedDate}T00:00:00`);
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      }).format(date);
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const showLoading = !hasLoaded || loading;
  const needsOnboarding = hasLoaded && initialSeed === null;

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <HeaderNavigation />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Trades</p>
          <h1 className="text-2xl font-semibold">{PAGE_TITLE}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{PAGE_SUBTITLE}</p>
        </header>

        {error && (
          <div className="mt-8 flex items-start justify-between rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-xs font-semibold uppercase tracking-wide underline"
            >
              {DISMISS_ERROR}
            </button>
          </div>
        )}

        <main className="mt-10">
          {showLoading && (
            <p className="text-sm text-slate-500 dark:text-slate-300">{LOADING_MESSAGE}</p>
          )}

          {!showLoading && needsOnboarding && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <p>{EMPTY_SEED_MESSAGE}</p>
              <button
                type="button"
                onClick={() => navigate('/', { replace: false })}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {ONBOARDING_BUTTON}
              </button>
            </div>
          )}

          {!showLoading && !needsOnboarding && initialSeed !== null && (
            <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
              <aside className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">거래 날짜 선택</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    캘린더에서 일자를 클릭하면 해당 날짜의 거래만 필터링되어 표시됩니다. 같은 날짜를 다시 클릭하면 선택이 해제됩니다.
                  </p>
                </div>
                <InlineDatePicker value={selectedDate} onChange={handleCalendarChange} />
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {selectedDate
                      ? `${SELECTED_DATE_LABEL}: ${formattedSelectedDate} (${filteredTrades.length}건)`
                      : '전체 거래가 표시됩니다.'}
                  </span>
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate('')}
                      className="rounded border border-slate-300 px-2 py-1 font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
                    >
                      {CLEAR_SELECTION_LABEL}
                    </button>
                  )}
                </div>
              </aside>
              <section>
                <TradeEntriesList
                  initialSeed={initialSeed}
                  trades={filteredTrades}
                  emptyMessage={selectedDate ? NO_TRADES_FOR_DATE : undefined}
                />
              </section>
            </div>
          )}
        </main>
      </div>
      <ThemeToggleButton />
    </div>
  );
};

export default TradesPage;
