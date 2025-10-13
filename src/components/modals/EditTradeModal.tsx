import React, { useEffect, useMemo, useState } from 'react';
import type { NewTradeEntry, TradeEntry } from '../../data/portfolioTypes';
import { formatSignedCurrency } from '../../utils/formatCurrency';
import { usePreferencesStore } from '../../store/preferencesStore';

interface EditTradeModalProps {
  open: boolean;
  trade: TradeEntry | null;
  submitting: boolean;
  deleteSubmitting: boolean;
  errorMessage: string | null;
  onSave: (values: NewTradeEntry) => Promise<void>;
  onDelete: () => Promise<void>;
  onCancel: () => void;
}

const TITLE = '거래 수정';
const DESCRIPTION = '거래 정보를 업데이트하거나 필요하지 않은 기록은 삭제할 수 있습니다.';
const TICKER_LABEL = '티커';
const PROFIT_LABEL = '손익';
const DATE_LABEL = '거래 날짜';
const ENTRY_NOTE_LABEL = '진입 근거';
const EXIT_NOTE_LABEL = '매도 근거';
const SAVE_LABEL = '저장';
const DELETE_LABEL = '삭제';
const CANCEL_LABEL = '취소';
const DELETE_CONFIRM = '이 거래를 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.';

const EditTradeModal: React.FC<EditTradeModalProps> = ({
  open,
  trade,
  submitting,
  deleteSubmitting,
  errorMessage,
  onSave,
  onDelete,
  onCancel
}) => {
  const currency = usePreferencesStore((state) => state.currency);
  const [ticker, setTicker] = useState('');
  const [profitLoss, setProfitLoss] = useState('');
  const [tradeDate, setTradeDate] = useState('');
  const [entryRationale, setEntryRationale] = useState('');
  const [exitRationale, setExitRationale] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!trade) {
      setTicker('');
      setProfitLoss('');
      setTradeDate('');
      setEntryRationale('');
      setExitRationale('');
      setLocalError(null);
      return;
    }

    setTicker(trade.ticker);
    setProfitLoss(String(trade.profitLoss));
    setTradeDate(trade.tradeDate);
    const fallbackNote = trade.entryRationale ?? trade.rationale ?? '';
    setEntryRationale(fallbackNote);
    setExitRationale(trade.exitRationale ?? '');
    setLocalError(null);
  }, [trade]);

  const parsedProfitLoss = useMemo(() => {
    const sanitized = profitLoss.replace(/,/g, '');
    const value = Number(sanitized);
    return Number.isFinite(value) ? value : NaN;
  }, [profitLoss]);

  const isValid =
    ticker.trim() !== '' &&
    !Number.isNaN(parsedProfitLoss) &&
    tradeDate.trim() !== '';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || !trade || deleteSubmitting) {
      setLocalError('티커, 손익, 날짜를 모두 입력해주세요.');
      return;
    }

    try {
      await onSave({
        ticker: ticker.trim(),
        profitLoss: parsedProfitLoss,
        tradeDate,
        entryRationale: entryRationale.trim() || undefined,
        exitRationale: exitRationale.trim() || undefined
      });
    } catch {
      // 오류는 상위 컴포넌트에서 처리
    }
  };

  if (!open || !trade) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 text-sm text-slate-700 shadow-xl dark:bg-slate-900 dark:text-slate-200"
      >
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{TITLE}</h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{DESCRIPTION}</p>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            {TICKER_LABEL}
            <input
              type="text"
              value={ticker}
              onChange={(event) => {
                setTicker(event.target.value.toUpperCase());
                setLocalError(null);
              }}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            {PROFIT_LABEL} ({currency})
            <input
              type="text"
              value={profitLoss}
              onChange={(event) => {
                setProfitLoss(event.target.value.replace(/[^0-9+-.,]/g, ''));
                setLocalError(null);
              }}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            {DATE_LABEL}
            <input
              type="date"
              value={tradeDate}
              onChange={(event) => {
                setTradeDate(event.target.value);
                setLocalError(null);
              }}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            {ENTRY_NOTE_LABEL}
            <textarea
              value={entryRationale}
              onChange={(event) => setEntryRationale(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
              placeholder="진입 시 어떤 근거를 확인했나요?"
            />
          </label>

          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            {EXIT_NOTE_LABEL}
            <textarea
              value={exitRationale}
              onChange={(event) => setExitRationale(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
              placeholder="청산 또는 손절 시점을 기록하세요."
            />
          </label>

          {isValid && !Number.isNaN(parsedProfitLoss) && (
            <p className="text-xs text-slate-500">손익 미리보기: {formatSignedCurrency(parsedProfitLoss)}</p>
          )}

          {(localError || errorMessage) && (
            <p className="text-xs text-red-500">{localError ?? errorMessage}</p>
          )}
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting || deleteSubmitting}
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {CANCEL_LABEL}
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting || deleteSubmitting}
              className="flex-1 rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {submitting ? '저장 중...' : SAVE_LABEL}
            </button>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (deleteSubmitting || submitting) return;
              if (!window.confirm(DELETE_CONFIRM)) return;
              await onDelete();
            }}
            disabled={deleteSubmitting || submitting}
            className="w-full rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            {deleteSubmitting ? '삭제 중...' : DELETE_LABEL}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTradeModal;
