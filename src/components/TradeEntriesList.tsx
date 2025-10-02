import React, { useMemo } from 'react';
import type { TradeEntry } from '../data/portfolioTypes';
import { formatCurrency, formatSignedCurrency } from '../utils/formatCurrency';
import { usePreferencesStore } from '../store/preferencesStore';

interface TradeEntriesListProps {
  initialSeed: number;
  trades: TradeEntry[];
}

const INITIAL_SEED_LABEL = '초기 시드';
const TOTAL_PNL_LABEL = '총 손익';
const CURRENT_CAPITAL_LABEL = '현재 자본';
const LIST_TITLE = '최근 거래';
const LIST_SUBTITLE = '각 기록을 검토하며 패턴을 찾아보세요.';
const EMPTY_MESSAGE = '아직 기록된 거래가 없습니다.';
const PROFIT_LABEL = '손익';
const LOGGED_LABEL = '기록 시간';

const TradeEntriesList: React.FC<TradeEntriesListProps> = ({ initialSeed, trades }) => {
  const currency = usePreferencesStore((state) => state.currency);
  const { totalPnL, currentSeed } = useMemo(() => {
    const total = trades.reduce((acc, trade) => acc + trade.profitLoss, 0);
    return {
      totalPnL: total,
      currentSeed: initialSeed + total
    };
  }, [initialSeed, trades]);

  const sorted = useMemo(() => {
    return [...trades].sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
  }, [trades]);

  const totalTone = totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600';

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{INITIAL_SEED_LABEL} ({currency})</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(initialSeed)}</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{TOTAL_PNL_LABEL} ({currency})</p>
          <p className={'mt-1 text-xl font-semibold ' + totalTone}>{formatSignedCurrency(totalPnL)}</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{CURRENT_CAPITAL_LABEL} ({currency})</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(currentSeed)}</p>
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">{LIST_TITLE}</h2>
          <p className="mt-1 text-xs text-slate-500">{LIST_SUBTITLE}</p>
        </div>
        {sorted.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">{EMPTY_MESSAGE}</div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {sorted.map((trade) => {
              const tone = trade.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600';
              return (
                <li key={trade.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[120px_120px_1fr]">
                  <div>
                    <p className="text-xs text-slate-500">Date</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{trade.tradeDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Ticker</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{trade.ticker}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500">{PROFIT_LABEL} ({currency})</p>
                        <p className={'mt-1 text-sm font-semibold ' + tone}>{formatSignedCurrency(trade.profitLoss)}</p>
                      </div>
                      <p className="text-xs text-slate-400">{LOGGED_LABEL} {new Date(trade.createdAt).toLocaleString()}</p>
                    </div>
                    {trade.rationale && (
                      <p className="text-sm leading-relaxed text-slate-600">{trade.rationale}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default TradeEntriesList;
