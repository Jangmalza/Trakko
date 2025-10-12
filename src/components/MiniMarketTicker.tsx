import React, { useEffect, useMemo, useState } from 'react';
import type { MarketQuote } from '../api/marketsApi';
import { fetchMarketQuotes } from '../api/marketsApi';

type MarketMetric = {
  id: string;
  label: string;
  value: number;
  unit?: string;
  change: number;
};

const BASE_MARKETS: MarketMetric[] = [
  { id: 'btc', label: '비트코인 (BTC)', value: 73000, unit: 'USD', change: 1.2 },
  { id: 'eth', label: '이더리움 (ETH)', value: 3800, unit: 'USD', change: 0.95 },
  { id: 'sp500', label: 'S&P 500', value: 5250.4, unit: undefined, change: 0.45 },
  { id: 'nasdaq', label: '나스닥 지수', value: 17950.23, unit: undefined, change: -0.6 },
  { id: 'vix', label: 'VIX 지수', value: 16.8, unit: undefined, change: 0.6 },
  { id: 'dji', label: '다우존스', value: 38000.12, unit: undefined, change: 0.22 }
];

const formatValue = (market: MarketMetric): string => {
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
  return formatter.format(market.value);
};

const MiniMarketTicker: React.FC = () => {
  const [markets, setMarkets] = useState<MarketMetric[]>(BASE_MARKETS);
  const intervalDelay = useMemo(() => 60_000, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const mergeQuotes = (quotes: MarketQuote[]) => {
      const map = new Map(quotes.map((quote) => [quote.id, quote]));
      return BASE_MARKETS.map((base) => {
        const quote = map.get(base.id);
        const value = typeof quote?.price === 'number' && quote.price > 0 ? quote.price : base.value;
        const change = typeof quote?.changePercent === 'number' ? quote.changePercent : base.change;
        return {
          ...base,
          value,
          change
        };
      });
    };

    const load = async () => {
      try {
        const quotes = await fetchMarketQuotes();
        if (!cancelled) {
          setMarkets(mergeQuotes(quotes));
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
    };
  }, [intervalDelay]);

  return (
    <div className="w-full border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 sm:gap-5">
        {markets.map((market) => {
          const isUp = market.change >= 0;
          const changeClass = isUp ? 'text-emerald-500' : 'text-rose-500';
          const sign = isUp ? '+' : '';

          return (
            <div key={market.id} className="flex flex-col items-center leading-tight sm:text-xs text-[11px]">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{market.label}</span>
              <span className="text-slate-600 dark:text-slate-300">
                {formatValue(market)}{' '}
                <span className={changeClass}>{`${sign}${market.change.toFixed(2)}%`}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniMarketTicker;
