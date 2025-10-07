import React, { useMemo, useState } from 'react';
import type { NewTradeEntry } from '../data/portfolioTypes';
import { usePreferencesStore } from '../store/preferencesStore';

interface TradeEntryFormProps {
  onSubmit: (entry: NewTradeEntry) => Promise<void>;
  loading?: boolean;
}

const TradeEntryForm: React.FC<TradeEntryFormProps> = ({ onSubmit, loading }) => {
  const currency = usePreferencesStore((state) => state.currency);
  const [ticker, setTicker] = useState('');
  const [profitLoss, setProfitLoss] = useState('');
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rationale, setRationale] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const parsedProfitLoss = useMemo(() => {
    const sanitized = profitLoss.replace(/,/g, '');
    const value = Number(sanitized);
    return Number.isFinite(value) ? value : NaN;
  }, [profitLoss]);

  const isValid = ticker.trim() !== '' && !Number.isNaN(parsedProfitLoss) && tradeDate !== '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) {
      setLocalError('티커, 손익, 날짜를 모두 입력해주세요.');
      return;
    }

    setLocalError(null);
    await onSubmit({
      ticker: ticker.trim(),
      profitLoss: parsedProfitLoss,
      rationale: rationale.trim(),
      tradeDate
    });

    setTicker('');
    setProfitLoss('');
    setRationale('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border border-slate-200 bg-white p-6 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">거래 기록</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">손익과 근거를 간단히 남겨 두세요.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">티커</span>
          <input
            type="text"
            value={ticker}
            onChange={(event) => setTicker(event.target.value.toUpperCase())}
            placeholder="AAPL"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 transition focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
          />
        </label>
        <label className="space-y-2">
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">손익 ({currency})</span>
          <input
            type="text"
            value={profitLoss}
            onChange={(event) => setProfitLoss(event.target.value.replace(/[^0-9+-.,]/g, ''))}
            placeholder="이익은 양수, 손실은 음수로 입력"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 transition focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">거래일</span>
        <input
          type="date"
          value={tradeDate}
          onChange={(event) => setTradeDate(event.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 transition focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
        />
      </label>

      <label className="space-y-2">
        <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">매매 근거</span>
        <textarea
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
          rows={4}
          placeholder="왜 이 거래를 했나요? 다음엔 무엇을 볼 것인가요?"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 transition focus:border-slate-500 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
        />
      </label>

      {localError && <p className="text-xs text-red-500">{localError}</p>}

      <button
        type="submit"
        disabled={loading || !isValid}
        className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:bg-slate-300 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {loading ? '저장 중...' : '기록 추가'}
      </button>
    </form>
  );
};

export default TradeEntryForm;
