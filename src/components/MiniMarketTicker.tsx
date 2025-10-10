import React, { useEffect, useMemo, useState } from 'react';

type MarketMetric = {
  id: string;
  label: string;
  value: number;
  unit?: string;
  change: number;
};

const BASE_MARKETS: MarketMetric[] = [
  { id: 'btc', label: '비트코인 (BTC)', value: 98000000, unit: 'KRW', change: 1.2 },
  { id: 'gold', label: '금 현물 (XAU)', value: 2375.8, unit: 'USD', change: 0.45 },
  { id: 'oil', label: 'WTI 유가', value: 78.2, unit: 'USD', change: -0.35 },
  { id: 'nasdaq', label: '나스닥 지수', value: 17950.23, change: -0.6 },
  { id: 'usdkrw', label: 'USD/KRW 환율', value: 1356.4, change: 0.3 }
];

const formatValue = (market: MarketMetric): string => {
  const formatter = new Intl.NumberFormat('ko-KR', {
    style: market.unit === 'KRW' ? 'currency' : 'decimal',
    currency: market.unit === 'KRW' ? 'KRW' : undefined,
    minimumFractionDigits: market.id === 'btc' ? 0 : 2,
    maximumFractionDigits: 2
  });

  return formatter.format(market.value);
};

const MiniMarketTicker: React.FC = () => {
  const [markets, setMarkets] = useState<MarketMetric[]>(BASE_MARKETS);

  const intervalDelay = useMemo(() => 15000, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMarkets((current) =>
        current.map((market) => {
          const noiseBase = (() => {
            switch (market.id) {
              case 'btc':
                return 200000;
              case 'gold':
              case 'oil':
                return 1.5;
              default:
                return 10;
            }
          })();
          const noise = (Math.random() - 0.5) * noiseBase;
          const nextValue = Math.max(market.value + noise, 0);
          const nextChange = ((nextValue - market.value) / Math.max(market.value, 1)) * 100;

          return {
            ...market,
            value: parseFloat(nextValue.toFixed(market.id === 'btc' ? 0 : 2)),
            change: parseFloat(nextChange.toFixed(2))
          };
        })
      );
    }, intervalDelay);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalDelay]);

  return (
    <div className="w-full border-t border-slate-200 bg-slate-50 px-6 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 text-center sm:gap-5">
        {markets.map((market) => {
          const isUp = market.change >= 0;
          const changeClass = isUp ? 'text-emerald-500' : 'text-rose-500';
          const sign = isUp ? '+' : '';

          return (
            <React.Fragment key={market.id}>
              <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">{market.label}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatValue(market)}</span>
                <span className={`${changeClass} font-medium`}>{`${sign}${market.change.toFixed(2)}%`}</span>
              </div>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600 last:hidden sm:px-1">
                |
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default MiniMarketTicker;
