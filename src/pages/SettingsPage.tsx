import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResetPortfolioSection from '../components/ResetPortfolioSection';
import HeaderNavigation from '../components/HeaderNavigation';
import ConfirmResetModal from '../components/modals/ConfirmResetModal';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useShallow } from 'zustand/react/shallow';
import { formatCurrency } from '../utils/formatCurrency';
import type { SupportedCurrency } from '../types/preferences';

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
  const { user, getLoginUrl } = useAuthStore();
  const {
    currency,
    loading: preferencesLoading,
    initialized: preferencesInitialized,
    error: preferencesError,
    loadPreferences,
    updateCurrency
  } = usePreferencesStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [goalTouched, setGoalTouched] = useState(false);
  const currentGoalId = performanceGoal?.goal?.id ?? null;
  const currentGoalTargetAmount = performanceGoal?.goal?.targetAmount ?? null;

  useEffect(() => {
    if (user && !preferencesInitialized && !preferencesLoading) {
      void loadPreferences();
    }
  }, [user, preferencesInitialized, preferencesLoading, loadPreferences]);

  useEffect(() => {
    if (goalTouched) return;

    const nextValue = currentGoalTargetAmount !== null
      ? formatGoalInputValue(currentGoalTargetAmount, currency)
      : '';

    setGoalInput((prev) => (prev === nextValue ? prev : nextValue));
  }, [goalTouched, currentGoalId, currentGoalTargetAmount, currency]);

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

  const sanitizedGoalValue = Number.parseFloat(goalInput.replace(/,/g, ''));
  const goalValid = Number.isFinite(sanitizedGoalValue) && sanitizedGoalValue > 0;
  const goalActionsDisabled = !user || goalLoading;
  const currentMonthLabel = performanceGoal?.month?.label ?? '';
  const progressPercentValue = performanceGoal?.progressPercent;
  const progressText = typeof progressPercentValue === 'number'
    ? `${progressPercentValue.toFixed(1)}%`
    : '—';

  const handleGoalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setGoalTouched(true);
    if (!goalValid) return;

    try {
      await upsertGoal({ targetAmount: sanitizedGoalValue, currency });
      setGoalTouched(false);
    } catch {
      // 에러는 store에서 처리
    }
  };

  const handleGoalDelete = async () => {
    if (!performanceGoal?.goal || goalActionsDisabled) return;
    if (!window.confirm('이번 달 성과 목표를 삭제할까요?')) {
      return;
    }

    try {
      await deleteGoal();
      setGoalTouched(false);
    } catch {
      // 에러는 store에서 처리
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <HeaderNavigation />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Settings</p>
          <h1 className="text-2xl font-semibold">계정 및 데이터 관리</h1>
          <p className="text-sm text-slate-500">
            Google 로그인과 데이터 초기화 기능을 이곳에서 관리합니다. 로그인 상태에서만 데이터 초기화가 가능합니다.
          </p>
        </header>

        <div className="space-y-6">
          <section className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-700">
            <h2 className="text-base font-semibold text-slate-900">표시 통화</h2>
            <p className="mt-2 text-sm text-slate-500">대시보드와 거래 입력에서 사용할 기본 통화를 선택하세요.</p>
            {preferencesLoading && !preferencesInitialized && (
              <p className="mt-3 text-xs text-slate-400">표시 통화를 불러오는 중입니다...</p>
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
                      selected ? 'border-slate-900 bg-slate-900/5' : 'border-slate-200 hover:border-slate-300'
                    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <span className="flex items-center justify-between text-sm font-semibold text-slate-900">
                      {option.label}
                      <span
                        className={`h-2 w-2 rounded-full ${selected ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        aria-hidden
                      />
                    </span>
                    <span className="text-xs text-slate-500">{option.description}</span>
                  </button>
                );
              })}
            </div>
            {!user && (
              <p className="mt-3 text-xs text-slate-400">로그인 후에만 통화를 변경할 수 있습니다.</p>
            )}
            {preferencesError && (
              <p className="mt-3 text-xs text-red-500">{preferencesError}</p>
            )}
          </section>

          <section className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-700">
            <h2 className="text-base font-semibold text-slate-900">성과 목표</h2>
            <p className="mt-2 text-sm text-slate-500">
              {currentMonthLabel ? `${currentMonthLabel} 손익 목표를 설정하세요.` : '이번 달 손익 목표를 설정하세요.'}
              {' '}목표 금액은 현재 표시 통화 기준으로 저장됩니다.
            </p>

            <form onSubmit={handleGoalSubmit} className="mt-4 space-y-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                목표 금액 ({currency})
                <input
                  type="text"
                  inputMode="decimal"
                  value={goalInput}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^0-9.,]/g, '');
                    setGoalTouched(true);
                    setGoalInput(value);
                    if (goalError) {
                      clearPortfolioError();
                    }
                  }}
                  onBlur={() => setGoalTouched(true)}
                  placeholder="예: 2000000"
                  disabled={goalActionsDisabled}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0 disabled:bg-slate-100"
                />
              </label>

              {goalTouched && !goalValid && (
                <p className="text-xs text-red-500">양의 숫자를 입력해주세요.</p>
              )}

              {goalError && (
                <p className="text-xs text-red-500">{goalError}</p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={goalActionsDisabled || !goalValid}
                  className="inline-flex items-center justify-center rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:bg-slate-300"
                >
                  {goalLoading ? '저장 중...' : performanceGoal?.goal ? '목표 업데이트' : '목표 저장'}
                </button>
                {performanceGoal?.goal && (
                  <button
                    type="button"
                    onClick={handleGoalDelete}
                    disabled={goalActionsDisabled}
                    className="inline-flex items-center justify-center rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                  >
                    목표 삭제
                  </button>
                )}
              </div>
            </form>

            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">목표 금액</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {performanceGoal?.goal ? formatCurrency(performanceGoal.goal.targetAmount) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">누적 손익</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(performanceGoal?.achievedAmount ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">남은 금액</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {performanceGoal?.goal && performanceGoal.remainingAmount !== null
                    ? formatCurrency(performanceGoal.remainingAmount)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">달성률</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{progressText}</p>
              </div>
            </div>

            {!user && (
              <p className="mt-4 text-xs text-slate-400">로그인 후에 성과 목표를 설정할 수 있습니다.</p>
            )}
          </section>

          <ResetPortfolioSection onResetClick={() => setModalOpen(true)} disabled={!user} />

          {!user && (
            <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
              <p>데이터 초기화 기능을 사용하려면 먼저 Google 계정으로 로그인하세요.</p>
              <button
                type="button"
                onClick={handleLogin}
                className="mt-4 w-full rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Google 로그인
              </button>
            </div>
          )}
        </div>
      </div>

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
