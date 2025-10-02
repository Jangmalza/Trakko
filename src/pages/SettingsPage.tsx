import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResetPortfolioSection from '../components/ResetPortfolioSection';
import HeaderNavigation from '../components/HeaderNavigation';
import ConfirmResetModal from '../components/modals/ConfirmResetModal';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { usePreferencesStore } from '../store/preferencesStore';
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

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { resetData } = usePortfolioStore();
  const {
    user,
    hasChecked,
    checking,
    bootstrap,
    getLoginUrl
  } = useAuthStore();
  const currency = usePreferencesStore((state) => state.currency);
  const preferencesLoading = usePreferencesStore((state) => state.loading);
  const preferencesInitialized = usePreferencesStore((state) => state.initialized);
  const preferencesError = usePreferencesStore((state) => state.error);
  const loadPreferences = usePreferencesStore((state) => state.loadPreferences);
  const updateCurrency = usePreferencesStore((state) => state.updateCurrency);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasChecked && !checking) {
      void bootstrap();
    }
  }, [bootstrap, hasChecked, checking]);

  useEffect(() => {
    if (user && !preferencesInitialized && !preferencesLoading) {
      void loadPreferences();
    }
  }, [user, preferencesInitialized, preferencesLoading, loadPreferences]);

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

                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer flex-col gap-2 rounded-lg border px-4 py-3 transition ${
                      selected ? 'border-slate-900 bg-slate-900/5' : 'border-slate-200 hover:border-slate-300'
                    } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <span className="flex items-center justify-between text-sm font-semibold text-slate-900">
                      {option.label}
                      <input
                        type="radio"
                        name="currency"
                        value={option.value}
                        className="hidden"
                        checked={selected}
                        disabled={disabled}
                        onChange={() => {
                          if (disabled) return;
                          void updateCurrency(option.value).catch(() => {
                            /* 오류 메시지는 store에서 처리 */
                          });
                        }}
                      />
                      <span
                        className={`h-2 w-2 rounded-full ${selected ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        aria-hidden
                      />
                    </span>
                    <span className="text-xs text-slate-500">{option.description}</span>
                  </label>
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
