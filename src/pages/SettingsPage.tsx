import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResetPortfolioSection from '../components/ResetPortfolioSection';
import HeaderNavigation from '../components/HeaderNavigation';
import ConfirmResetModal from '../components/modals/ConfirmResetModal';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasChecked && !checking) {
      void bootstrap();
    }
  }, [bootstrap, hasChecked, checking]);

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
