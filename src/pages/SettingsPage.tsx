import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResetPortfolioSection from '../components/ResetPortfolioSection';
import HeaderNavigation from '../components/HeaderNavigation';
import ConfirmResetModal from '../components/modals/ConfirmResetModal';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useShallow } from 'zustand/react/shallow';
import { formatCurrency } from '../utils/formatCurrency';
import type { SupportedCurrency } from '../types/preferences';
import type { TraderType } from '../data/portfolioTypes';
import { updateTraderType as updateTraderTypeRequest } from '../api/profileApi';

const currencyOptions: Array<{ value: SupportedCurrency; label: string; description: string }> = [
  {
    value: 'KRW',
    label: '대한민국 원 (KRW)',
    description: '원화 기준 통화 표시, 소수점 없이 금액을 보여줍니다.'
  },
  {
    value: 'USD',
    label: '미국 달러 (USD)',
    description: '달러 기준 통화 표시, 센트 단위(소수점 둘째 자리)까지 표시합니다.'
  }
];

const formatGoalInputValue = (value: number, currency: SupportedCurrency) => {
  const fractionDigits = currency === 'KRW' ? 0 : 2;
  return Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: fractionDigits > 0 ? 2 : 0,
        maximumFractionDigits: fractionDigits
      })
    : '';
};

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    resetData,
    performanceGoal,
    goalLoading,
    goalError,
    upsertGoal,
    deleteGoal,
    clearError: clearPortfolioError
  } = usePortfolioStore(useShallow((state) => ({
    resetData: state.resetData,
    performanceGoal: state.performanceGoal,
    goalLoading: state.goalLoading,
    goalError: state.goalError,
    upsertGoal: state.upsertGoal,
    deleteGoal: state.deleteGoal,
    clearError: state.clearError
  })));
  const { user, getLoginUrl, setTraderType: setUserTraderType } = useAuthStore();
  const {
    currency,
    loading: preferencesLoading,
    initialized: preferencesInitialized,
    error: preferencesError,
    loadPreferences,
    updateCurrency
  } = usePreferencesStore();
  const traderType = usePortfolioStore((state) => state.traderType);
  const setTraderTypeLocal = usePortfolioStore((state) => state.setTraderTypeLocal);
  const traderTypeOptions: Array<{ value: TraderType; label: string; description: string }> = [
    {
      value: 'CRYPTO',
      label: '암호화폐 거래자',
      description: '코인·디지털 자산 기반 거래를 주로 합니다.'
    },
    {
      value: 'US_STOCK',
      label: '미국주식 거래자',
      description: '미국 증시에 상장된 종목을 중심으로 투자합니다.'
    },
    {
      value: 'KR_STOCK',
      label: '한국주식 거래자',
      description: '국내 코스피/코스닥 종목 위주로 거래합니다.'
    }
  ];
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [monthlyGoalInput, setMonthlyGoalInput] = useState('');
  const [monthlyGoalTouched, setMonthlyGoalTouched] = useState(false);
  const [annualGoalInput, setAnnualGoalInput] = useState('');
  const [annualGoalTouched, setAnnualGoalTouched] = useState(false);
  const [traderTypeUpdating, setTraderTypeUpdating] = useState(false);
  const [traderTypeError, setTraderTypeError] = useState<string | null>(null);
  const monthlySummary = performanceGoal?.monthly ?? null;
  const annualSummary = performanceGoal?.annual ?? null;
  const currentMonthlyTargetAmount = monthlySummary?.goal?.targetAmount ?? null;
  const currentAnnualTargetAmount = annualSummary?.goal?.targetAmount ?? null;
  const monthlyLabel = monthlySummary?.timeFrame.label ?? '';
  const annualLabel = annualSummary?.timeFrame.label ?? '';
  const monthlyProgressPercent = monthlySummary?.progressPercent ?? null;
  const annualProgressPercent = annualSummary?.progressPercent ?? null;
  const now = useMemo(() => new Date(), []);
  const monthlyYear = monthlySummary?.timeFrame.year ?? now.getFullYear();
  const monthlyMonth = monthlySummary?.timeFrame.month ?? now.getMonth() + 1;
  const annualYear = annualSummary?.timeFrame.year ?? now.getFullYear();
  const monthlyDisplayLabel = monthlyLabel || `${monthlyYear}년 ${monthlyMonth}월`;
  const annualDisplayLabel = annualLabel || `${annualYear}년`;

  useEffect(() => {
    if (user && !preferencesInitialized && !preferencesLoading) {
      void loadPreferences();
    }
  }, [user, preferencesInitialized, preferencesLoading, loadPreferences]);

  useEffect(() => {
    if (monthlyGoalTouched) return;

    const nextValue = currentMonthlyTargetAmount !== null
      ? formatGoalInputValue(currentMonthlyTargetAmount, currency)
      : '';

    setMonthlyGoalInput((prev) => (prev === nextValue ? prev : nextValue));
  }, [monthlyGoalTouched, currentMonthlyTargetAmount, currency]);

  useEffect(() => {
    if (annualGoalTouched) return;

    const nextValue = currentAnnualTargetAmount !== null
      ? formatGoalInputValue(currentAnnualTargetAmount, currency)
      : '';

    setAnnualGoalInput((prev) => (prev === nextValue ? prev : nextValue));
  }, [annualGoalTouched, currentAnnualTargetAmount, currency]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await resetData();
      setSubmitting(false);
      setModalOpen(false);
      navigate('/', { replace: true });
    } catch (error) {
      setSubmitting(false);
      setSubmitError(error instanceof Error ? error.message : '초기화에 실패했습니다.');
    }
  };

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const sanitizedMonthlyValue = Number.parseFloat(monthlyGoalInput.replace(/,/g, ''));
  const sanitizedAnnualValue = Number.parseFloat(annualGoalInput.replace(/,/g, ''));
  const monthlyGoalValid = Number.isFinite(sanitizedMonthlyValue) && sanitizedMonthlyValue > 0;
  const annualGoalValid = Number.isFinite(sanitizedAnnualValue) && sanitizedAnnualValue > 0;
  const goalActionsDisabled = !user || goalLoading;
  const monthlyProgressText = typeof monthlyProgressPercent === 'number' ? `${monthlyProgressPercent.toFixed(1)}%` : '—';
  const annualProgressText = typeof annualProgressPercent === 'number' ? `${annualProgressPercent.toFixed(1)}%` : '—';

  const handleMonthlyGoalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setMonthlyGoalTouched(true);
    if (!monthlyGoalValid) return;

    try {
      await upsertGoal({
        targetAmount: sanitizedMonthlyValue,
        currency,
        period: 'MONTHLY',
        year: monthlyYear,
        month: monthlyMonth
      });
      setMonthlyGoalTouched(false);
    } catch {
      // 에러는 store에서 처리
    }
  };

  const handleMonthlyGoalDelete = async () => {
    if (!monthlySummary?.goal || goalActionsDisabled) return;
    if (!window.confirm('해당 월의 성과 목표를 삭제할까요?')) {
      return;
    }

    try {
      await deleteGoal({ period: 'MONTHLY', year: monthlyYear, month: monthlyMonth ?? undefined });
      setMonthlyGoalTouched(false);
    } catch {
      // 에러는 store에서 처리
    }
  };

  const handleAnnualGoalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setAnnualGoalTouched(true);
    if (!annualGoalValid) return;

    try {
      await upsertGoal({
        targetAmount: sanitizedAnnualValue,
        currency,
        period: 'ANNUAL',
        year: annualYear
      });
      setAnnualGoalTouched(false);
    } catch {
      // 에러는 store에서 처리
    }
  };

  const handleAnnualGoalDelete = async () => {
    if (!annualSummary?.goal || goalActionsDisabled) return;
    if (!window.confirm('연간 성과 목표를 삭제할까요?')) {
      return;
    }

    try {
      await deleteGoal({ period: 'ANNUAL', year: annualYear });
      setAnnualGoalTouched(false);
    } catch {
      // 에러는 store에서 처리
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <HeaderNavigation />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Settings</p>
          <h1 className="text-2xl font-semibold">계정 및 데이터 관리</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Google 로그인과 데이터 초기화 기능을 이곳에서 관리합니다. 로그인 상태에서만 데이터 초기화가 가능합니다.
          </p>
        </header>

        <div className="space-y-6">
          <section className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">주요 거래 유형</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              맞춤형 인사이트와 뉴스 추천을 위해 주로 거래하는 자산군을 선택하세요.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {traderTypeOptions.map((option) => {
                const selected = option.value === traderType;
                const disabled = !user || traderTypeUpdating;

                const handleSelect = () => {
                  if (disabled || selected) return;
                  setTraderTypeUpdating(true);
                  setTraderTypeError(null);
                  void updateTraderTypeRequest(option.value)
                    .then((updated) => {
                      setTraderTypeLocal(updated);
                      setUserTraderType(updated);
                    })
                    .catch((updateError) => {
                      console.error('Failed to update trader type', updateError);
                      setTraderTypeError(
                        updateError instanceof Error ? updateError.message : '거래 유형을 변경하지 못했습니다.'
                      );
                    })
                    .finally(() => {
                      setTraderTypeUpdating(false);
                    });
                };

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={handleSelect}
                    disabled={disabled}
                    aria-pressed={selected}
                    className={`flex flex-col gap-2 rounded-lg border px-4 py-3 text-left transition ${
                      selected
                        ? 'border-slate-900 bg-slate-900/5 dark:border-slate-500 dark:bg-slate-800/60'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-500'
                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <span className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {option.label}
                      <span
                        className={`h-2 w-2 rounded-full ${selected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        aria-hidden
                      />
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{option.description}</span>
                  </button>
                );
              })}
            </div>
            {traderTypeUpdating && (
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">거래 유형을 변경하는 중입니다...</p>
            )}
            {traderTypeError && (
              <p className="mt-3 text-xs text-red-500">{traderTypeError}</p>
            )}
          </section>

          <section className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">표시 통화</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">대시보드와 거래 입력에서 사용할 기본 통화를 선택하세요.</p>
            {preferencesLoading && !preferencesInitialized && (
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">표시 통화를 불러오는 중입니다...</p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {currencyOptions.map((option) => {
                const selected = option.value === currency;
                const disabled = !user || preferencesLoading;

                const handleSelect = () => {
                  if (disabled || selected) {
                    return;
                  }
                  void updateCurrency(option.value).catch(() => {
                    /* 오류 메시지는 store에서 처리 */
                  });
                };

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={handleSelect}
                    disabled={disabled}
                    aria-pressed={selected}
                    className={`flex flex-col gap-2 rounded-lg border px-4 py-3 text-left transition ${
                      selected
                        ? 'border-slate-900 bg-slate-900/5 dark:border-slate-500 dark:bg-slate-800/60'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-500'
                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <span className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {option.label}
                      <span
                        className={`h-2 w-2 rounded-full ${selected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        aria-hidden
                      />
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{option.description}</span>
                  </button>
                );
              })}
            </div>
            {!user && (
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">로그인 후에만 통화를 변경할 수 있습니다.</p>
            )}
            {preferencesError && (
              <p className="mt-3 text-xs text-red-500">{preferencesError}</p>
            )}
          </section>

          <section className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">성과 목표</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              월간·연간 손익 목표를 각각 관리하세요. 목표 금액은 현재 표시 통화 기준으로 저장됩니다.
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                <header className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">월간 목표</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{monthlyDisplayLabel}</h3>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      이번 달 목표 금액을 입력하면 대시보드에서 진행률을 추적할 수 있어요.
                    </p>
                  </div>
                </header>

                <form onSubmit={handleMonthlyGoalSubmit} className="mt-4 space-y-3">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    목표 금액 ({currency})
                    <input
                      type="text"
                      inputMode="decimal"
                      value={monthlyGoalInput}
                      onChange={(event) => {
                        const value = event.target.value.replace(/[^0-9.,]/g, '');
                        setMonthlyGoalTouched(true);
                        setMonthlyGoalInput(value);
                        if (goalError) {
                          clearPortfolioError();
                        }
                      }}
                      onBlur={() => setMonthlyGoalTouched(true)}
                      placeholder="예: 2,000,000"
                      disabled={goalActionsDisabled}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
                    />
                  </label>

                  {monthlyGoalTouched && !monthlyGoalValid && (
                    <p className="text-xs text-red-500">양의 숫자를 입력해주세요.</p>
                  )}

                  {goalError && monthlyGoalTouched && (
                    <p className="text-xs text-red-500">{goalError}</p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={goalActionsDisabled || !monthlyGoalValid}
                      className="inline-flex items-center justify-center rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      {goalLoading ? '저장 중...' : monthlySummary?.goal ? '월간 목표 업데이트' : '월간 목표 저장'}
                    </button>
                    {monthlySummary?.goal && (
                      <button
                        type="button"
                        onClick={handleMonthlyGoalDelete}
                        disabled={goalActionsDisabled}
                        className="inline-flex items-center justify-center rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-500/10 dark:disabled:border-slate-700 dark:disabled:text-slate-600"
                      >
                        월간 목표 삭제
                      </button>
                    )}
                  </div>
                </form>

                <dl className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <dt>목표 금액</dt>
                    <dd>{monthlySummary?.goal ? formatCurrency(monthlySummary.goal.targetAmount) : '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>누적 손익</dt>
                    <dd>{formatCurrency(monthlySummary?.achievedAmount ?? 0)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>남은 금액</dt>
                    <dd>
                      {monthlySummary?.goal && monthlySummary.remainingAmount !== null
                        ? formatCurrency(monthlySummary.remainingAmount)
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>달성률</dt>
                    <dd>{monthlyProgressText}</dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                <header className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">연간 목표</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{annualDisplayLabel}</h3>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      연간 목표를 설정하면 장기 전략의 진척도를 한눈에 확인할 수 있습니다.
                    </p>
                  </div>
                </header>

                <form onSubmit={handleAnnualGoalSubmit} className="mt-4 space-y-3">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    목표 금액 ({currency})
                    <input
                      type="text"
                      inputMode="decimal"
                      value={annualGoalInput}
                      onChange={(event) => {
                        const value = event.target.value.replace(/[^0-9.,]/g, '');
                        setAnnualGoalTouched(true);
                        setAnnualGoalInput(value);
                        if (goalError) {
                          clearPortfolioError();
                        }
                      }}
                      onBlur={() => setAnnualGoalTouched(true)}
                      placeholder="예: 20,000,000"
                      disabled={goalActionsDisabled}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
                    />
                  </label>

                  {annualGoalTouched && !annualGoalValid && (
                    <p className="text-xs text-red-500">양의 숫자를 입력해주세요.</p>
                  )}

                  {goalError && annualGoalTouched && (
                    <p className="text-xs text-red-500">{goalError}</p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={goalActionsDisabled || !annualGoalValid}
                      className="inline-flex items-center justify-center rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      {goalLoading ? '저장 중...' : annualSummary?.goal ? '연간 목표 업데이트' : '연간 목표 저장'}
                    </button>
                    {annualSummary?.goal && (
                      <button
                        type="button"
                        onClick={handleAnnualGoalDelete}
                        disabled={goalActionsDisabled}
                        className="inline-flex items-center justify-center rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-500/10 dark:disabled:border-slate-700 dark:disabled:text-slate-600"
                      >
                        연간 목표 삭제
                      </button>
                    )}
                  </div>
                </form>

                <dl className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <dt>목표 금액</dt>
                    <dd>{annualSummary?.goal ? formatCurrency(annualSummary.goal.targetAmount) : '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>누적 손익</dt>
                    <dd>{formatCurrency(annualSummary?.achievedAmount ?? 0)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>남은 금액</dt>
                    <dd>
                      {annualSummary?.goal && annualSummary.remainingAmount !== null
                        ? formatCurrency(annualSummary.remainingAmount)
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>달성률</dt>
                    <dd>{annualProgressText}</dd>
                  </div>
                </dl>
              </article>
            </div>

            {!user && (
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">로그인 후에 성과 목표를 설정할 수 있습니다.</p>
            )}
          </section>

          <ResetPortfolioSection onResetClick={() => setModalOpen(true)} disabled={!user} />

          {!user && (
            <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <p>데이터 초기화 기능을 사용하려면 먼저 Google 계정으로 로그인하세요.</p>
              <button
                type="button"
                onClick={handleLogin}
                className="mt-4 w-full rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Google 로그인
              </button>
            </div>
          )}
        </div>
      </div>

      <ThemeToggleButton />

      <ConfirmResetModal
        open={modalOpen && !!user}
        onCancel={() => {
          if (!submitting) {
            setModalOpen(false);
            setSubmitError(null);
          }
        }}
        onConfirm={handleConfirm}
        submitting={submitting}
        errorMessage={submitError}
      />
    </div>
  );
};

export default SettingsPage;
