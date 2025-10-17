import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TradeEntryForm from '../components/TradeEntryForm';
import SeedOverviewChart from '../components/SeedOverviewChart';
import TradeEntriesList from '../components/TradeEntriesList';
import HeaderNavigation from '../components/HeaderNavigation';
import ThemeToggleButton from '../components/ThemeToggleButton';
import GoalProgressCard from '../components/GoalProgressCard';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { requestPerformanceReport, type ReportGranularity } from '../api/reportsApi';

const DASHBOARD_TITLE = '일일 자본 트래커';
const DASHBOARD_SUBTITLE = '각 거래가 전체 자본에 미치는 영향을 기록하고, 결정의 근거를 남겨 다음 전략에 반영하세요.';
const ERROR_CLOSE_LABEL = '닫기';
const LOADING_MESSAGE = '데이터를 불러오는 중입니다. 잠시만 기다려주세요.';

const PortfolioDashboard: React.FC = () => {
  const navigate = useNavigate();
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
  const isProUser = useMemo(() => user?.role === 'ADMIN' || user?.subscriptionTier === 'PRO', [user]);
  const [tradeSavedNoticeVisible, setTradeSavedNoticeVisible] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportSuccessVisible, setReportSuccessVisible] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportGranularity, setReportGranularity] = useState<ReportGranularity>('MONTHLY');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  const toIsoDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const updateRangeForGranularity = useCallback((value: ReportGranularity) => {
    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let startDate = new Date(endDate);

    if (value === 'DAILY') {
      // same-day report
    } else if (value === 'WEEKLY') {
      startDate = new Date(endDate);
      const dayOfWeek = startDate.getDay();
      const diff = dayOfWeek === 0 ? 0 : dayOfWeek;
      startDate.setDate(startDate.getDate() - diff);
    } else if (value === 'MONTHLY') {
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    } else {
      // YEARLY: first day of current year
      startDate = new Date(endDate.getFullYear(), 0, 1);
    }

    setReportStartDate(toIsoDate(startDate));
    setReportEndDate(toIsoDate(endDate));
  }, [toIsoDate]);

  useEffect(() => {
    if (!reportStartDate || !reportEndDate) {
      updateRangeForGranularity(reportGranularity);
    }
  }, [reportGranularity, reportStartDate, reportEndDate, updateRangeForGranularity]);

  useEffect(() => {
    if (reportError !== null) {
      setReportError(null);
    }
  }, [reportGranularity, reportStartDate, reportEndDate, reportError]);

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

  const showTradeSavedNotice = () => {
    setTradeSavedNoticeVisible(true);
    setReportSuccessVisible(false);
    if (promoTimeoutRef.current) {
      window.clearTimeout(promoTimeoutRef.current);
    }
    promoTimeoutRef.current = window.setTimeout(() => {
      setTradeSavedNoticeVisible(false);
      setReportSuccessVisible(false);
      promoTimeoutRef.current = null;
    }, 4000);
  };

  const showReportSuccess = () => {
    setReportSuccessVisible(true);
    setTradeSavedNoticeVisible(false);
    if (promoTimeoutRef.current) {
      window.clearTimeout(promoTimeoutRef.current);
    }
    promoTimeoutRef.current = window.setTimeout(() => {
      setReportSuccessVisible(false);
      promoTimeoutRef.current = null;
    }, 4000);
  };

  const handleAddTrade = async (payload: Parameters<typeof addTrade>[0]) => {
    try {
      await addTrade(payload);
      showTradeSavedNotice();
    } catch {
      // state already updated with error
    }
  };

  const showPlaceholder = !hasLoaded || initialSeed === null;

  const filteredTrades = useMemo(() => {
    if (isProUser) {
      return trades;
    }
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    cutoff.setHours(0, 0, 0, 0);
    return trades.filter((trade) => {
      const tradeDate = new Date(`${trade.tradeDate}T00:00:00`);
      return tradeDate >= cutoff;
    });
  }, [trades, isProUser]);

  const adjustedInitialSeed = useMemo(() => {
    if (initialSeed === null) return null;
    if (isProUser) return initialSeed;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    cutoff.setHours(0, 0, 0, 0);
    const priorPnL = trades
      .filter((trade) => new Date(`${trade.tradeDate}T00:00:00`) < cutoff)
      .reduce((acc, trade) => acc + trade.profitLoss, 0);
    return initialSeed + priorPnL;
  }, [initialSeed, trades, isProUser]);

  const handleGenerateReport = async () => {
    if (reportGenerating) return;
    setReportError(null);
    if (!reportStartDate || !reportEndDate) {
      setReportError('리포트 기간을 먼저 설정해주세요.');
      return;
    }
    if (reportStartDate > reportEndDate) {
      setReportError('시작일이 종료일보다 늦을 수 없습니다.');
      return;
    }
    setReportGenerating(true);
    try {
      const blob = await requestPerformanceReport({
        granularity: reportGranularity,
        startDate: reportStartDate,
        endDate: reportEndDate
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      const stamp = new Date().toISOString().split('T')[0];
      anchor.download = `trakko-performance-report-${reportGranularity.toLowerCase()}-${stamp}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(objectUrl);
      showReportSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : '리포트를 생성하지 못했습니다.';
      setReportError(message);
    } finally {
      setReportGenerating(false);
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

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">AI Report</p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI 성과 리포트</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">기간과 집계 단위를 지정하면 맞춤형 PDF 리포트를 내려받을 수 있습니다.</p>
            </div>
            <div className="flex flex-col gap-4 md:items-end">
              <div className="flex flex-col gap-3 text-xs text-slate-500 dark:text-slate-300 sm:flex-row sm:flex-wrap sm:items-center">
                <label className="flex items-center gap-2">
                  <span className="whitespace-nowrap font-semibold">집계 단위</span>
                  <select
                    value={reportGranularity}
                    onChange={(event) => {
                      const value = event.target.value as ReportGranularity;
                      setReportGranularity(value);
                      updateRangeForGranularity(value);
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600"
                  >
                    <option value="DAILY">일간</option>
                    <option value="WEEKLY">주간</option>
                <option value="MONTHLY">월간</option>
                <option value="YEARLY">연간</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span className="whitespace-nowrap font-semibold">시작일</span>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(event) => setReportStartDate(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="whitespace-nowrap font-semibold">종료일</span>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(event) => setReportEndDate(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={showPlaceholder || reportGenerating}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:disabled:bg-slate-700"
              >
                {reportGenerating ? '리포트 생성 중...' : 'PDF 다운로드'}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div
            className="mt-8 flex items-center justify-between gap-4 rounded border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white dark:bg-red-400">!</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-xs font-semibold text-red-600 underline transition hover:text-red-800 dark:text-red-200 dark:hover:text-red-100"
            >
              {ERROR_CLOSE_LABEL}
            </button>
          </div>
        )}

        {reportError && (
          <div
            className="mt-6 flex items-center justify-between gap-4 rounded border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
            role="alert"
            aria-live="assertive"
          >
            <span>{reportError}</span>
            <button
              type="button"
              onClick={() => setReportError(null)}
              className="text-xs font-semibold text-amber-700 underline transition hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100"
            >
              {ERROR_CLOSE_LABEL}
            </button>
          </div>
        )}

        {showPlaceholder ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-sm text-slate-500 dark:text-slate-300" role="status" aria-live="polite">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 border-t-slate-500 dark:border-slate-700 dark:border-t-slate-200"
            >
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-transparent dark:border-slate-500" aria-hidden="true" />
            </span>
            <p>{LOADING_MESSAGE}</p>
          </div>
        ) : (
          <main className="mt-10 grid gap-10 lg:grid-cols-[320px_1fr]">
            <TradeEntryForm onSubmit={handleAddTrade} loading={loading} />
            <div className="space-y-8">
              {(tradeSavedNoticeVisible || reportSuccessVisible) && (
                <section className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 shadow-sm dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <span>{tradeSavedNoticeVisible ? '거래가 성공적으로 저장되었어요.' : '성과 리포트를 내려받았습니다.'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTradeSavedNoticeVisible(false);
                      setReportSuccessVisible(false);
                      if (promoTimeoutRef.current) {
                        window.clearTimeout(promoTimeoutRef.current);
                        promoTimeoutRef.current = null;
                      }
                    }}
                    className="rounded px-2 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100/70 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                  >
                    닫기
                  </button>
                </section>
              )}
              {performanceGoal && (
                <GoalProgressCard summary={performanceGoal} loading={goalLoading} showAnnual={isProUser} />
              )}
              <SeedOverviewChart initialSeed={(adjustedInitialSeed ?? initialSeed)!} trades={filteredTrades} />
              {!isProUser && (
                <section className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  <p>무료 사용자에게는 최근 3개월 거래 내역만 표시됩니다. 전체 히스토리와 확장 기능은 Pro에서 이용할 수 있어요.</p>
                  <Link
                    to="/subscription"
                    className="mt-2 inline-flex w-max items-center gap-2 rounded-full border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-blue-300 dark:text-blue-200 dark:hover:bg-blue-300/10"
                  >
                    Pro 업그레이드 알아보기
                  </Link>
                </section>
              )}
              <TradeEntriesList initialSeed={(adjustedInitialSeed ?? initialSeed)!} trades={filteredTrades} />
            </div>
          </main>
        )}
      </div>
      <ThemeToggleButton />
    </div>
  );
};

export default PortfolioDashboard;
