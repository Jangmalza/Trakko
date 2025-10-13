import React, { useMemo, useState } from 'react';
import type { NewTradeEntry, TradeEntry } from '../data/portfolioTypes';
import { formatCurrency, formatSignedCurrency } from '../utils/formatCurrency';
import EditTradeModal from './modals/EditTradeModal';
import { usePortfolioStore } from '../store/portfolioStore';
import { usePreferencesStore } from '../store/preferencesStore';

interface TradeEntriesListProps {
  initialSeed: number;
  trades: TradeEntry[];
  emptyMessage?: string;
}

const INITIAL_SEED_LABEL = '초기 자본';
const TOTAL_PNL_LABEL = '누적 손익';
const CURRENT_CAPITAL_LABEL = '현재 자본';
const EMPTY_MESSAGE = '아직 등록된 거래가 없습니다.';
const PROFIT_LABEL = '손익';
const LOGGED_LABEL = '기록 시각';
const DATE_LABEL = '날짜';
const TICKER_LABEL = '티커';
const EDIT_LABEL = '수정';
const DELETE_CONFIRM = '이 거래를 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.';

type ViewMode = 'list' | 'daily' | 'monthly';

interface TradeGroup {
  key: string;
  label: string;
  total: number;
  trades: TradeEntry[];
}

const VIEW_MODE_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: 'list', label: '전체' },
  { value: 'daily', label: '일별' },
  { value: 'monthly', label: '월별' }
];

const TradeEntriesList: React.FC<TradeEntriesListProps> = ({ initialSeed, trades, emptyMessage }) => {
  const currency = usePreferencesStore((state) => state.currency);
  const traderType = usePortfolioStore((state) => state.traderType);
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
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      }),
    []
  );

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long'
      }),
    []
  );

  const dailyGroups = useMemo<TradeGroup[]>(() => {
    const groups = new Map<string, TradeGroup>();
    sorted.forEach((trade) => {
      const key = trade.tradeDate;
      let group = groups.get(key);
      if (!group) {
        const date = new Date(`${trade.tradeDate}T00:00:00`);
        group = {
          key,
          label: dayFormatter.format(date),
          total: 0,
          trades: []
        };
        groups.set(key, group);
      }
      group.total += trade.profitLoss;
      group.trades.push(trade);
    });
    return Array.from(groups.values());
  }, [sorted, dayFormatter]);

  const monthlyGroups = useMemo<TradeGroup[]>(() => {
    const groups = new Map<string, TradeGroup>();
    sorted.forEach((trade) => {
      const [year, month] = trade.tradeDate.split('-');
      const key = `${year}-${month}`;
      let group = groups.get(key);
      if (!group) {
        const labelDate = new Date(Number(year), Number(month) - 1, 1);
        group = {
          key,
          label: monthFormatter.format(labelDate),
          total: 0,
          trades: []
        };
        groups.set(key, group);
      }
      group.total += trade.profitLoss;
      group.trades.push(trade);
    });
    return Array.from(groups.values());
  }, [sorted, monthFormatter]);

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

  const renderTradeRow = (trade: TradeEntry, paddingClass = 'px-5 py-4') => {
    const tone =
      trade.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
    const entryNote = trade.entryRationale?.trim();
    const exitNote = trade.exitRationale?.trim();
    const legacyNote = trade.rationale?.trim();

    return (
      <li
        key={trade.id}
        className={`grid gap-4 ${paddingClass} sm:grid-cols-[120px_120px_1fr]`}
      >
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{DATE_LABEL}</p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{trade.tradeDate}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{TICKER_LABEL}</p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{trade.ticker}</p>
        </div>
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{PROFIT_LABEL} ({currency})</p>
              <p className={'mt-1 text-sm font-semibold ' + tone}>{formatSignedCurrency(trade.profitLoss)}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
              <span>
                {LOGGED_LABEL}{' '}
                {new Date(trade.createdAt).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => handleEditClick(trade)}
                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                {EDIT_LABEL}
              </button>
            </div>
          </div>
          {(entryNote || exitNote || legacyNote) && (
            <div className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {entryNote && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">진입 근거</p>
                  <p className="mt-1">{entryNote}</p>
                </div>
              )}
              {exitNote && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">매도 근거</p>
                  <p className="mt-1">{exitNote}</p>
                </div>
              )}
              {!entryNote && !exitNote && legacyNote && (
                <p>{legacyNote}</p>
              )}
            </div>
          )}
        </div>
      </li>
    );
  };

  const renderTradeList = () => (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {sorted.map((trade) => renderTradeRow(trade))}
    </ul>
  );

  const renderGroupedView = (groups: TradeGroup[]) => (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {groups.map((group) => {
        const groupTone =
          group.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
        return (
          <section key={group.key} className="px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{group.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{group.trades.length}건</p>
              </div>
              <p className={`text-sm font-semibold ${groupTone}`}>{formatSignedCurrency(group.total)}</p>
            </div>
            <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
              {group.trades.map((trade) => renderTradeRow(trade, 'px-4 py-3'))}
            </ul>
          </section>
        );
      })}
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">{INITIAL_SEED_LABEL} ({currency})</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(initialSeed)}</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">{TOTAL_PNL_LABEL} ({currency})</p>
          <p className={'mt-1 text-xl font-semibold ' + totalTone}>{formatSignedCurrency(totalPnL)}</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">{CURRENT_CAPITAL_LABEL} ({currency})</p>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(currentSeed)}</p>
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {traderType === 'CRYPTO'
              ? '최근 암호화폐 거래 기록'
              : traderType === 'US_STOCK'
                ? '최근 미국주식 거래 기록'
                : '최근 국내주식 거래 기록'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {traderType === 'CRYPTO'
              ? '변동성이 큰 코인 포지션을 다시 점검하세요.'
              : traderType === 'US_STOCK'
                ? '실적/경제 일정과 함께 손익 흐름을 확인하세요.'
                : '환율과 수급 변화 속에서 패턴을 찾아보세요.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {VIEW_MODE_OPTIONS.map((option) => {
              const active = viewMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setViewMode(option.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        {sorted.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">{emptyMessage ?? EMPTY_MESSAGE}</div>
        ) : viewMode === 'list' ? (
          renderTradeList()
        ) : viewMode === 'daily' ? (
          renderGroupedView(dailyGroups)
        ) : (
          renderGroupedView(monthlyGroups)
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
