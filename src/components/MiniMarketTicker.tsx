import React, { useEffect, useMemo, useState } from 'react';
import type { MarketQuote } from '../api/marketsApi';
import { fetchMarketQuotes } from '../api/marketsApi';

type MarketMetric = {
  id: string;
  label: string;
  value: number | null;
  unit?: string;
  change: number | null;
  trend: 'up' | 'down' | null;
};

const BASE_MARKETS: MarketMetric[] = [
  { id: 'btc', label: '비트코인 (BTC)', value: null, unit: 'USD', change: null, trend: null },
  { id: 'eth', label: '이더리움 (ETH)', value: null, unit: 'USD', change: null, trend: null },
  { id: 'sp500', label: 'S&P 500', value: null, unit: undefined, change: null, trend: null },
  { id: 'nasdaq', label: '나스닥 지수', value: null, unit: undefined, change: null, trend: null },
  { id: 'dji', label: '다우존스', value: null, unit: undefined, change: null, trend: null },
  { id: 'nasdaq_futures', label: '나스닥 선물', value: null, unit: undefined, change: null, trend: null },
  { id: 'nikkei', label: '니케이 225', value: null, unit: undefined, change: null, trend: null }
];

const formatValue = (market: MarketMetric): string => {
  if (!Number.isFinite(market.value)) {
    return '—';
  }

  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };

  if (market.unit === 'USD') {
    options.style = 'currency';
    options.currency = 'USD';
  } else if (market.unit === 'KRW') {
    options.style = 'currency';
    options.currency = 'KRW';
    options.maximumFractionDigits = 0;
  }

  const formatter = new Intl.NumberFormat('en-US', options);
  return formatter.format(market.value as number);
};

const MiniMarketTicker: React.FC = () => {
  const [markets, setMarkets] = useState<MarketMetric[]>(BASE_MARKETS);
  const intervalDelay = useMemo(() => 10_000, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let trendResetTimer: number | undefined;

    const mergeQuotes = (previous: MarketMetric[], quotes: MarketQuote[]) => {
      const prevMap = new Map(previous.map((item) => [item.id, item]));
      const quoteMap = new Map(quotes.map((quote) => [quote.id, quote]));

      return BASE_MARKETS.map((base) => {
        const prev = prevMap.get(base.id) ?? base;
        const quote = quoteMap.get(base.id);
        const nextValue =
          typeof quote?.price === 'number' && Number.isFinite(quote.price) ? quote.price : prev.value;
        const nextChange =
          typeof quote?.changePercent === 'number' && Number.isFinite(quote.changePercent)
            ? quote.changePercent
            : prev.change;

        let trend: MarketMetric['trend'] = null;
        if (Number.isFinite(nextValue) && Number.isFinite(prev.value) && nextValue !== prev.value) {
          trend = (nextValue as number) > (prev.value as number) ? 'up' : 'down';
        }

        return {
          ...base,
          value: nextValue,
          change: nextChange,
          trend
        } satisfies MarketMetric;
      });
    };

    const load = async () => {
      try {
        const quotes = await fetchMarketQuotes();
        if (cancelled) return;

        let shouldResetTrend = false;
        setMarkets((current) => {
          const merged = mergeQuotes(current, quotes);
          shouldResetTrend = merged.some((market) => market.trend !== null);
          return merged;
        });

        if (!cancelled && shouldResetTrend) {
          if (trendResetTimer) {
            window.clearTimeout(trendResetTimer);
          }
          trendResetTimer = window.setTimeout(() => {
            setMarkets((current) =>
              current.map((market) => (market.trend ? { ...market, trend: null } : market))
            );
          }, 1000);
        }
      } catch (error) {
        console.warn('Failed to load market quotes', error);
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(load, intervalDelay);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
      if (trendResetTimer) {
        window.clearTimeout(trendResetTimer);
      }
    };
  }, [intervalDelay]);

  return (
    <div className="w-full border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 sm:gap-5">
        {markets.map((market) => {
          const isUp = Number.isFinite(market.change) && (market.change as number) >= 0;
          const changeClass = Number.isFinite(market.change)
            ? isUp
              ? 'text-emerald-500'
              : 'text-rose-500'
            : 'text-slate-400 dark:text-slate-500';
          const changeText = Number.isFinite(market.change)
            ? `${isUp ? '+' : ''}${(market.change as number).toFixed(2)}%`
            : '—';

          const flashClass =
            market.trend === 'up'
              ? 'bg-emerald-100/70 dark:bg-emerald-500/20'
              : market.trend === 'down'
                ? 'bg-rose-100/70 dark:bg-rose-500/20'
                : '';

          return (
            <div key={market.id} className="flex flex-col items-center leading-tight sm:text-xs text-[11px]">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{market.label}</span>
              <span
                className={`mt-0.5 inline-flex items-center gap-1 rounded px-2 py-0.5 text-slate-600 transition-colors duration-500 dark:text-slate-300 ${flashClass}`}
              >
                {formatValue(market)}
                <span className={changeClass}>{changeText}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniMarketTicker;
