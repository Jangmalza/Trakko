import React, { useMemo, useState } from 'react';
import type { NewTradeEntry, TradeEntry } from '../data/portfolioTypes';
import { formatCurrency, formatSignedCurrency } from '../utils/formatCurrency';
import EditTradeModal from './modals/EditTradeModal';
import { usePortfolioStore } from '../store/portfolioStore';
import { usePreferencesStore } from '../store/preferencesStore';

interface TradeEntriesListProps {
  initialSeed: number;
  trades: TradeEntry[];
}

const INITIAL_SEED_LABEL = '초기 자본';
const TOTAL_PNL_LABEL = '누적 손익';
const CURRENT_CAPITAL_LABEL = '현재 자본';
const LIST_TITLE = '최근 거래 기록';
const LIST_SUBTITLE = '기록을 되돌아보며 패턴을 발견해보세요.';
const EMPTY_MESSAGE = '아직 등록된 거래가 없습니다.';
const PROFIT_LABEL = '손익';
const LOGGED_LABEL = '기록 시각';
const DATE_LABEL = '날짜';
const TICKER_LABEL = '티커';
const EDIT_LABEL = '수정';
const DELETE_CONFIRM = '이 거래를 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.';

const TradeEntriesList: React.FC<TradeEntriesListProps> = ({ initialSeed, trades }) => {
  const currency = usePreferencesStore((state) => state.currency);
  const updateTrade = usePortfolioStore((state) => state.updateTrade);
  const deleteTrade = usePortfolioStore((state) => state.deleteTrade);

  const { totalPnL, currentSeed } = useMemo(() => {
    const total = trades.reduce((acc, trade) => acc + trade.profitLoss, 0);
    return {
      totalPnL: total,
      currentSeed: initialSeed + total
    };
  }, [initialSeed, trades]);

  const sorted = useMemo(() => (
    [...trades].sort((a, b) => b.tradeDate.localeCompare(a.tradeDate))
  ), [trades]);

  const totalTone = totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600';

  const [editingTrade, setEditingTrade] = useState<TradeEntry | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleEditClick = (trade: TradeEntry) => {
    setEditingTrade(trade);
    setEditError(null);
  };

  const handleCloseModal = () => {
    if (editSubmitting || deleteSubmitting) return;
    setEditingTrade(null);
    setEditError(null);
  };

  const handleSave = async (values: NewTradeEntry) => {
    if (!editingTrade) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateTrade(editingTrade.id, values);
      setEditingTrade(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : '거래를 수정하지 못했습니다.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTrade) return;
    if (!window.confirm(DELETE_CONFIRM)) {
      return;
    }
    setDeleteSubmitting(true);
    setEditError(null);
    try {
      await deleteTrade(editingTrade.id);
      setEditingTrade(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : '거래를 삭제하지 못했습니다.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

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
                    <p className="text-xs text-slate-500">{DATE_LABEL}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{trade.tradeDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{TICKER_LABEL}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{trade.ticker}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs text-slate-500">{PROFIT_LABEL} ({currency})</p>
                        <p className={'mt-1 text-sm font-semibold ' + tone}>{formatSignedCurrency(trade.profitLoss)}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{LOGGED_LABEL} {new Date(trade.createdAt).toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => handleEditClick(trade)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          {EDIT_LABEL}
                        </button>
                      </div>
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

      <EditTradeModal
        open={Boolean(editingTrade)}
        trade={editingTrade}
        onCancel={handleCloseModal}
        onSave={handleSave}
        onDelete={handleDelete}
        submitting={editSubmitting}
        deleteSubmitting={deleteSubmitting}
        errorMessage={editError}
      />
    </section>
  );
};

export default TradeEntriesList;
