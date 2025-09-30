import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResetPortfolioSection from '../components/ResetPortfolioSection';
import HeaderNavigation from '../components/HeaderNavigation';
import ConfirmResetModal from '../components/modals/ConfirmResetModal';
import { usePortfolioStore } from '../store/portfolioStore';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { resetData } = usePortfolioStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <HeaderNavigation />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Settings</p>
          <h1 className="text-2xl font-semibold">계정 및 데이터 관리</h1>
          <p className="text-sm text-slate-500">
            Google 로그인과 데이터 초기화 기능을 준비 중입니다. 아래에서 일지 데이터를 초기화하거나 향후 계정 기능을 설정할 수 있습니다.
          </p>
        </header>

        <div className="space-y-6">
          <ResetPortfolioSection onResetClick={() => setModalOpen(true)} />
        </div>
      </div>

      <ConfirmResetModal
        open={modalOpen}
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
