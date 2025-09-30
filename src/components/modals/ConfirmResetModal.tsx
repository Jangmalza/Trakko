import React from 'react';

interface ConfirmResetModalProps {
  open: boolean;
  submitting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmResetModal: React.FC<ConfirmResetModalProps> = ({
  open,
  submitting,
  errorMessage,
  onConfirm,
  onCancel
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-sm text-slate-700 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">데이터 초기화</h2>
        <p className="mt-3 text-sm text-slate-500">
          초기 시드와 모든 거래 기록이 삭제됩니다. 되돌릴 수 없으니 진행 전에 다시 한 번 확인하세요.
        </p>

        {errorMessage && (
          <p className="mt-3 text-xs text-red-500">{errorMessage}</p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {submitting ? '초기화 중...' : '삭제하고 초기화'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmResetModal;
