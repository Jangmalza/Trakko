import React from 'react';

interface ResetPortfolioSectionProps {
  onResetClick: () => void;
  disabled?: boolean;
}

const ResetPortfolioSection: React.FC<ResetPortfolioSectionProps> = ({ onResetClick, disabled = false }) => (
  <section className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">데이터 초기화</h2>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
      투자 일지 데이터를 초기 상태로 되돌립니다. 초기화하면 시드와 모든 거래 기록이 삭제되며 다시 온보딩 화면으로 이동합니다.
    </p>
    <button
      type="button"
      onClick={onResetClick}
      disabled={disabled}
      className="mt-4 w-full rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-500/10 dark:disabled:border-slate-700 dark:disabled:text-slate-600"
    >
      데이터 초기화 진행
    </button>
  </section>
);

export default ResetPortfolioSection;
